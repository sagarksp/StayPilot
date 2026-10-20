import { prisma } from "@/infrastructure/db/prisma";
import { createNotifications } from "@/modules/notification/application/use-cases";
import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import { isWillNotEatOption, type CreatePollInput, type FoodMenuInput, type MealTypesInput, type ResidentFoodAvailabilityInput, type UpdateFoodMenuInput, type VoteInput } from "./schemas";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
function localToday(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function localDateAt(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function effectivePollStatus(status: string, closesAt: Date, now: Date) {
  return status === "OPEN" && closesAt <= now ? "CLOSED" : status;
}
function assertStaff(actor: OrganizationActor, propertyId?: string) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
  if (actor.roles.includes("MANAGER") && !actor.roles.includes("OWNER") && propertyId && !actor.allowedPgIds.includes(propertyId)) throw new AccessDeniedError();
}
function assertFoodControl(actor: OrganizationActor, propertyId?: string) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
  if (actor.roles.includes("MANAGER") && !actor.roles.includes("OWNER") && propertyId && !actor.allowedPgIds.includes(propertyId)) throw new AccessDeniedError();
}

async function currentResidentFoodStay(actor: OrganizationActor) {
  if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
  const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, status: "ACTIVE", user: { publicId: actor.userId }, residentId: { not: null }, roles: { some: { roleCode: "RESIDENT" } } }, select: { residentId: true } });
  if (!membership?.residentId) return null;
  const today = day(localToday(actor.organizationTimezone));
  const stay = await prisma.residentStay.findFirst({
    where: { organization: { publicId: actor.organizationId }, residentId: membership.residentId, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    select: { id: true, organizationId: true, propertyId: true, startDate: true, endDate: true },
    orderBy: { startDate: "desc" },
  });
  return stay;
}

function validateMenuItems(input: FoodMenuInput) {
  if (input.items.some((item) => item.date < input.validFrom || item.date > input.validTo)) throw new Error("MENU_ITEM_OUTSIDE_RANGE");
  const duplicates = new Set<string>();
  for (const item of input.items) {
    const key = `${item.date}:${item.mealTypeId}:${item.dishName.trim().toLocaleLowerCase()}`;
    if (duplicates.has(key)) throw new Error("DUPLICATE_MENU_ITEM");
    duplicates.add(key);
  }
}

export const foodUseCases = {
  async listMealTypes(actor: OrganizationActor, propertyPublicId: string) {
    let propertyScopeId: bigint | undefined;
    if (actor.roles.includes("RESIDENT")) {
      const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, user: { publicId: actor.userId }, residentId: { not: null }, status: "ACTIVE" }, select: { residentId: true } });
      if (!membership?.residentId) throw new AccessDeniedError();
      const today = day(localToday(actor.organizationTimezone));
      const stay = await prisma.residentStay.findFirst({ where: { organization: { publicId: actor.organizationId }, residentId: membership.residentId, property: { publicId: propertyPublicId }, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { propertyId: true } });
      if (!stay) throw new AccessDeniedError();
      propertyScopeId = stay.propertyId;
    } else {
      assertStaff(actor, propertyPublicId);
    }
    const property = await prisma.property.findFirst({ where: { publicId: propertyPublicId, organization: { publicId: actor.organizationId }, ...(propertyScopeId ? { id: propertyScopeId } : {}) }, select: { id: true, organizationId: true } });
    if (!property) throw new AccessDeniedError();
    return prisma.foodMealType.findMany({ where: { organizationId: property.organizationId, propertyId: property.id, status: "ACTIVE" }, select: { publicId: true, name: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
  },

  async listManagerPolls(actor: OrganizationActor, propertyPublicId: string) {
    assertFoodControl(actor, propertyPublicId);
    const property = await prisma.property.findFirst({ where: { publicId: propertyPublicId, organization: { publicId: actor.organizationId }, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    const polls = await prisma.foodPoll.findMany({ where: { organization: { publicId: actor.organizationId }, propertyId: property.id }, select: { publicId: true, propertyId: true, mealDate: true, opensAt: true, closesAt: true, status: true, mealType: { select: { name: true } }, options: { select: { id: true, publicId: true, label: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }, votes: { select: { optionId: true, residentStayId: true, suggestion: true } } }, orderBy: [{ mealDate: "desc" }, { createdAt: "desc" }] });
    const pollDates = polls.map((poll) => poll.mealDate);
    const today = day(localToday(actor.organizationTimezone));
    const earliest = pollDates.reduce((start, date) => date < start ? date : start, today);
    const latest = pollDates.reduce((end, date) => date > end ? date : end, today);
    const absences = await prisma.residentFoodUnavailability.findMany({ where: { organization: { publicId: actor.organizationId }, propertyId: property.id, cancelledAt: null, startsOn: { lte: latest }, endsOn: { gte: earliest } }, select: { residentStayId: true, startsOn: true, endsOn: true } });
    const now = new Date();
    return polls.map((poll) => {
      const awayStayIds = new Set(absences.filter((absence) => absence.startsOn <= poll.mealDate && absence.endsOn >= poll.mealDate).map((absence) => absence.residentStayId));
      const eligibleVotes = poll.votes.filter((vote) => !awayStayIds.has(vote.residentStayId));
      return {
        ...poll,
        status: effectivePollStatus(poll.status, poll.closesAt, now),
        options: poll.options.map(({ id, ...option }) => ({ ...option, _count: { votes: eligibleVotes.filter((vote) => vote.optionId === id).length }, suggestions: eligibleVotes.filter((vote) => vote.optionId === id && vote.suggestion).map((vote) => vote.suggestion!) })),
      };
    });
  },

  async getStaffPage(actor: OrganizationActor) {
    assertStaff(actor);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const properties = await prisma.property.findMany({ where: { organizationId: organization.id, status: "ACTIVE", ...(actor.roles.includes("OWNER") ? {} : { publicId: { in: [...actor.allowedPgIds] } }) }, select: { id: true, publicId: true, name: true }, orderBy: { name: "asc" } });
    if (!properties.length) return { properties, mealTypes: [], polls: [], menus: [], attendance: [], canSeePollResults: false };
    const ids = properties.map((property) => property.id);
    const today = day(localToday(actor.organizationTimezone));
    const horizon = new Date(today);
    horizon.setUTCDate(horizon.getUTCDate() + 13);
    const [mealTypes, polls, menus, stays] = await Promise.all([
      prisma.foodMealType.findMany({ where: { organizationId: organization.id, propertyId: { in: ids }, status: "ACTIVE" }, select: { publicId: true, propertyId: true, property: { select: { name: true, publicId: true } }, name: true, displayOrder: true }, orderBy: [{ property: { name: "asc" } }, { displayOrder: "asc" }, { id: "asc" }] }),
      actor.roles.includes("MANAGER") || actor.roles.includes("OWNER") ? prisma.foodPoll.findMany({ where: { organizationId: organization.id, propertyId: { in: ids } }, select: { publicId: true, propertyId: true, property: { select: { name: true } }, mealDate: true, opensAt: true, closesAt: true, status: true, mealType: { select: { name: true } }, options: { select: { id: true, publicId: true, label: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }, votes: { select: { optionId: true, residentStayId: true, suggestion: true } } }, orderBy: [{ mealDate: "desc" }, { createdAt: "desc" }], take: 60 }) : Promise.resolve([]),
      prisma.foodMenu.findMany({ where: { organizationId: organization.id, propertyId: { in: ids }, status: "PUBLISHED" }, select: { publicId: true, propertyId: true, title: true, validFrom: true, validTo: true, items: { select: { id: true, menuDate: true, dishName: true, description: true, mealType: { select: { name: true } } }, orderBy: [{ menuDate: "asc" }, { mealType: { displayOrder: "asc" } }, { id: "asc" }] } }, orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }], take: 60 }),
      prisma.residentStay.findMany({ where: { organizationId: organization.id, propertyId: { in: ids }, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: horizon }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { id: true, propertyId: true, startDate: true, endDate: true } }),
    ]);
    const pollDates = polls.map((poll) => poll.mealDate);
    const absenceRangeStart = pollDates.reduce((earliest, date) => date < earliest ? date : earliest, today);
    const absenceRangeEnd = pollDates.reduce((latest, date) => date > latest ? date : latest, horizon);
    const absences = await prisma.residentFoodUnavailability.findMany({ where: { organizationId: organization.id, propertyId: { in: ids }, cancelledAt: null, startsOn: { lte: absenceRangeEnd }, endsOn: { gte: absenceRangeStart } }, select: { residentStayId: true, propertyId: true, startsOn: true, endsOn: true } });
    const attendance = properties.map((property) => ({ propertyId: property.id, propertyName: property.name, days: Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + offset);
      const totalResidents = stays.filter((stay) => stay.propertyId === property.id && stay.startDate <= date && (!stay.endDate || stay.endDate >= date)).length;
      const awayResidents = stays.filter((stay) => stay.propertyId === property.id && stay.startDate <= date && (!stay.endDate || stay.endDate >= date) && absences.some((absence) => absence.residentStayId === stay.id && absence.startsOn <= date && absence.endsOn >= date)).length;
      return { date, totalResidents, awayResidents, expectedMeals: totalResidents - awayResidents };
    }) }));
    const now = new Date();
    const visiblePolls = polls.map((poll) => {
      const awayStayIds = new Set(absences.filter((absence) => absence.propertyId === poll.propertyId && absence.startsOn <= poll.mealDate && absence.endsOn >= poll.mealDate).map((absence) => absence.residentStayId));
      const eligibleVotes = poll.votes.filter((vote) => !awayStayIds.has(vote.residentStayId));
      const eligibleStays = poll.mealDate >= today && poll.mealDate <= horizon
        ? stays.filter((stay) => stay.propertyId === poll.propertyId && stay.startDate <= poll.mealDate && (!stay.endDate || stay.endDate >= poll.mealDate) && !awayStayIds.has(stay.id))
        : null;
      return {
        ...poll,
        status: effectivePollStatus(poll.status, poll.closesAt, now),
        votesReceived: eligibleVotes.length,
        eligibleResidentCount: eligibleStays?.length ?? null,
        options: poll.options.map(({ id, ...option }) => ({ ...option, _count: { votes: eligibleVotes.filter((vote) => vote.optionId === id).length }, suggestions: eligibleVotes.filter((vote) => vote.optionId === id && vote.suggestion).map((vote) => vote.suggestion!) })),
      };
    });
    return { properties, mealTypes, polls: visiblePolls, menus, attendance, canSeePollResults: actor.roles.includes("MANAGER") || actor.roles.includes("OWNER") };
  },

  async listMenus(actor: OrganizationActor, propertyPublicId: string, from?: string, to?: string) {
    const property = await prisma.property.findFirst({ where: { publicId: propertyPublicId, organization: { publicId: actor.organizationId }, status: "ACTIVE" }, select: { id: true, organizationId: true } });
    if (!property) throw new AccessDeniedError();
    if (actor.roles.includes("RESIDENT")) {
      const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, user: { publicId: actor.userId }, residentId: { not: null }, status: "ACTIVE", roles: { some: { roleCode: "RESIDENT" } } }, select: { residentId: true } });
      if (!membership?.residentId) throw new AccessDeniedError();
      const today = day(localToday(actor.organizationTimezone));
      const stay = await prisma.residentStay.findFirst({ where: { organizationId: property.organizationId, propertyId: property.id, residentId: membership.residentId, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { endDate: true } });
      if (!stay) throw new AccessDeniedError();
      const start = from ? day(from) : today;
      const end = to ? day(to) : stay.endDate ?? new Date(`${localDateAt(new Date(Date.now() + 14 * 86400000), actor.organizationTimezone)}T00:00:00.000Z`);
      return prisma.foodMenu.findMany({ where: { organizationId: property.organizationId, propertyId: property.id, status: "PUBLISHED", validFrom: { lte: end }, validTo: { gte: start } }, select: { publicId: true, title: true, validFrom: true, validTo: true, items: { where: { menuDate: { gte: start, lte: end }, ...(stay.endDate ? { menuDate: { gte: start, lte: stay.endDate < end ? stay.endDate : end } } : {}) }, select: { menuDate: true, dishName: true, description: true, mealType: { select: { name: true, displayOrder: true } } }, orderBy: [{ menuDate: "asc" }, { mealType: { displayOrder: "asc" } }, { id: "asc" }] } }, orderBy: [{ validFrom: "asc" }, { createdAt: "asc" }] });
    }
    assertStaff(actor, propertyPublicId);
    return prisma.foodMenu.findMany({ where: { organizationId: property.organizationId, propertyId: property.id, status: "PUBLISHED", ...(from || to ? { validFrom: { ...(to ? { lte: day(to) } : {}) }, validTo: { ...(from ? { gte: day(from) } : {}) } } : {}) }, select: { publicId: true, title: true, validFrom: true, validTo: true, items: { select: { menuDate: true, dishName: true, description: true, mealType: { select: { name: true, displayOrder: true } } }, orderBy: [{ menuDate: "asc" }, { mealType: { displayOrder: "asc" } }, { id: "asc" }] } }, orderBy: [{ validFrom: "asc" }, { createdAt: "asc" }] });
  },

  async createMenu(actor: OrganizationActor, input: FoodMenuInput) {
    assertFoodControl(actor, input.propertyId);
    validateMenuItems(input);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const property = await prisma.property.findFirst({ where: { publicId: input.propertyId, organizationId: organization.id, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    const configuredTypes = await prisma.foodMealType.findMany({ where: { organizationId: organization.id, propertyId: property.id, status: "ACTIVE", publicId: { in: [...new Set(input.items.map((item) => item.mealTypeId))] } }, select: { id: true, publicId: true } });
    if (configuredTypes.length !== new Set(input.items.map((item) => item.mealTypeId)).size) throw new Error("INVALID_MEAL_TYPE");
    const user = await prisma.user.findUniqueOrThrow({ where: { publicId: actor.userId }, select: { id: true } });
    return prisma.$transaction(async (tx) => {
      const menu = await tx.foodMenu.create({ data: { organizationId: organization.id, propertyId: property.id, title: input.title || null, validFrom: day(input.validFrom), validTo: day(input.validTo), status: "PUBLISHED", createdById: user.id, publishedAt: new Date() }, select: { publicId: true, status: true } });
      const internalMenu = await tx.foodMenu.findUniqueOrThrow({ where: { publicId: menu.publicId }, select: { id: true } });
      await tx.foodMenuItem.createMany({ data: input.items.map((item) => ({ organizationId: organization.id, propertyId: property.id, menuId: internalMenu.id, menuDate: day(item.date), mealTypeId: configuredTypes.find((type) => type.publicId === item.mealTypeId)!.id, dishName: item.dishName.trim(), description: item.description || null })) });
      return menu;
    });
  },

  async updateMenu(actor: OrganizationActor, input: UpdateFoodMenuInput) {
    assertFoodControl(actor, input.propertyId);
    validateMenuItems(input);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const property = await prisma.property.findFirst({ where: { publicId: input.propertyId, organizationId: organization.id, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    const menu = await prisma.foodMenu.findFirst({ where: { publicId: input.menuId, organizationId: organization.id, propertyId: property.id, status: "PUBLISHED" }, select: { id: true, validFrom: true, validTo: true, items: { select: { menuDate: true, mealTypeId: true } } } });
    if (!menu) throw new Error("FOOD_MENU_NOT_FOUND");
    const mealTypeIds = [...new Set(input.items.map((item) => item.mealTypeId))];
    const configuredTypes = await prisma.foodMealType.findMany({ where: { organizationId: organization.id, propertyId: property.id, status: "ACTIVE", publicId: { in: mealTypeIds } }, select: { id: true, publicId: true } });
    if (configuredTypes.length !== mealTypeIds.length) throw new Error("INVALID_MEAL_TYPE");
    const editedPairs = new Map<string, { mealDate: Date; mealTypeId: bigint }>();
    for (const item of menu.items) editedPairs.set(`${item.menuDate.toISOString().slice(0, 10)}:${item.mealTypeId}`, { mealDate: item.menuDate, mealTypeId: item.mealTypeId });
    for (const item of input.items) {
      const mealTypeId = configuredTypes.find((type) => type.publicId === item.mealTypeId)!.id;
      editedPairs.set(`${item.date}:${mealTypeId}`, { mealDate: day(item.date), mealTypeId });
    }
    const closedPoll = await prisma.foodPoll.findFirst({ where: { organizationId: organization.id, propertyId: property.id, OR: [...editedPairs.values()].map((pair) => ({ mealDate: pair.mealDate, mealTypeId: pair.mealTypeId })), AND: [{ OR: [{ status: "CLOSED" }, { closesAt: { lte: new Date() } }] }] }, select: { id: true } });
    if (closedPoll) throw new Error("FOOD_MENU_LOCKED");
    return prisma.$transaction(async (tx) => {
      await tx.foodMenuItem.deleteMany({ where: { organizationId: organization.id, propertyId: property.id, menuId: menu.id } });
      await tx.foodMenu.update({ where: { id: menu.id }, data: { title: input.title || null, validFrom: day(input.validFrom), validTo: day(input.validTo) } });
      await tx.foodMenuItem.createMany({ data: input.items.map((item) => ({ organizationId: organization.id, propertyId: property.id, menuId: menu.id, menuDate: day(item.date), mealTypeId: configuredTypes.find((type) => type.publicId === item.mealTypeId)!.id, dishName: item.dishName.trim(), description: item.description || null })) });
    });
  },

  async replaceMealTypes(actor: OrganizationActor, input: MealTypesInput) {
    assertStaff(actor, input.propertyId);
    const names = input.mealTypes.map((name) => name.trim());
    if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) throw new Error("DUPLICATE_MEAL_TYPE");
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const property = await prisma.property.findFirst({ where: { publicId: input.propertyId, organizationId: organization.id, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    return prisma.$transaction(async (tx) => {
      await tx.foodMealType.updateMany({ where: { organizationId: organization.id, propertyId: property.id, status: "ACTIVE", ...(names.length ? { name: { notIn: names } } : {}) }, data: { status: "INACTIVE" } });
      for (const [displayOrder, name] of names.entries()) {
        await tx.foodMealType.upsert({
          where: { propertyId_name: { propertyId: property.id, name } },
          create: { organizationId: organization.id, propertyId: property.id, name, displayOrder, status: "ACTIVE" },
          update: { displayOrder, status: "ACTIVE" },
        });
      }
    });
  },

  async createPoll(actor: OrganizationActor, input: CreatePollInput) {
    assertFoodControl(actor, input.propertyId);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const property = await prisma.property.findFirst({ where: { publicId: input.propertyId, organizationId: organization.id, status: "ACTIVE" }, select: { id: true } });
    if (!property) throw new AccessDeniedError();
    const today = localToday(actor.organizationTimezone);
    const tomorrowDate = day(today);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);
    const closesAt = new Date(input.closesAt);
    if (input.mealDate < tomorrow || closesAt <= new Date() || localDateAt(closesAt, actor.organizationTimezone) >= input.mealDate) throw new Error("INVALID_POLL_TIME");
    const configuredMealType = await prisma.foodMealType.findFirst({ where: { publicId: input.mealTypeId, organizationId: organization.id, propertyId: property.id, status: "ACTIVE" }, select: { id: true } });
    if (!configuredMealType) throw new Error("INVALID_MEAL_TYPE");
    const user = await prisma.user.findUniqueOrThrow({ where: { publicId: actor.userId }, select: { id: true } });
    const options = input.options.some(isWillNotEatOption) ? input.options : [...input.options, "Will Not Eat"];
    if (options.length > 12) throw new Error("INVALID_POLL_OPTION");
    try {
      return await prisma.$transaction(async (tx) => {
        const poll = await tx.foodPoll.create({ data: { organizationId: organization.id, propertyId: property.id, mealTypeId: configuredMealType.id, mealDate: day(input.mealDate), opensAt: new Date(), closesAt, createdById: user.id, options: { create: options.map((label, displayOrder) => ({ label, displayOrder })) } }, select: { publicId: true, status: true, mealDate: true, mealType: { select: { name: true } } } });
        const stays = await tx.residentStay.findMany({ where: { organizationId: organization.id, propertyId: property.id, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: poll.mealDate }, OR: [{ endDate: null }, { endDate: { gte: poll.mealDate } }] }, select: { id: true, residentId: true } });
        if (stays.length) {
          const stayIds = stays.map(({ id }) => id);
          const awayStays = await tx.residentFoodUnavailability.findMany({ where: { organizationId: organization.id, propertyId: property.id, residentStayId: { in: stayIds }, cancelledAt: null, startsOn: { lte: poll.mealDate }, endsOn: { gte: poll.mealDate } }, select: { residentStayId: true } });
          const awayStayIds = new Set(awayStays.map(({ residentStayId }) => residentStayId));
          const residentIds = [...new Set(stays.filter(({ id }) => !awayStayIds.has(id)).map(({ residentId }) => residentId))];
          if (residentIds.length) {
            const recipients = await tx.organizationMembership.findMany({ where: { organizationId: organization.id, status: "ACTIVE", residentId: { in: residentIds }, roles: { some: { roleCode: "RESIDENT" } }, user: { status: "ACTIVE" } }, select: { userId: true } });
            await createNotifications(tx, [...new Set(recipients.map(({ userId }) => userId))].map((userId) => ({
              organizationId: organization.id,
              propertyId: property.id,
              userId,
              dedupeKey: `food-poll:${poll.publicId}`,
              notificationType: "FOOD_POLL_OPENED",
              title: "A new meal poll is open",
              message: `Vote for ${poll.mealType.name} on ${input.mealDate}.`,
              actionUrl: `/org/${actor.organizationId}/resident#food-heading`,
            })));
          }
        }
        return { publicId: poll.publicId, status: poll.status };
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("FOOD_POLL_ALREADY_EXISTS");
      throw error;
    }
  },

  async closePoll(actor: OrganizationActor, pollPublicId: string, propertyPublicId?: string) {
    assertFoodControl(actor, propertyPublicId);
    const propertyScope = propertyPublicId
      ? { publicId: propertyPublicId }
      : actor.roles.includes("OWNER")
        ? undefined
        : { publicId: { in: [...actor.allowedPgIds] } };
    const poll = await prisma.foodPoll.findFirst({ where: { publicId: pollPublicId, organization: { publicId: actor.organizationId }, ...(propertyScope ? { property: propertyScope } : {}), status: "OPEN" }, select: { id: true } });
    if (!poll) throw new Error("FOOD_POLL_NOT_OPEN");
    await prisma.foodPoll.updateMany({ where: { id: poll.id, status: "OPEN" }, data: { status: "CLOSED" } });
  },

  async listForResident(actor: OrganizationActor) {
    const stay = await currentResidentFoodStay(actor);
    if (!stay) return [];
    const today = day(localToday(actor.organizationTimezone));
    const polls = await prisma.foodPoll.findMany({ where: { organization: { publicId: actor.organizationId }, propertyId: stay.propertyId, status: "OPEN", mealDate: { gte: today, ...(stay.endDate ? { lte: stay.endDate } : {}) }, closesAt: { gt: new Date() } }, select: { publicId: true, mealDate: true, opensAt: true, closesAt: true, property: { select: { name: true } }, mealType: { select: { name: true } }, options: { select: { publicId: true, label: true, displayOrder: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }, votes: { where: { residentStayId: stay.id }, select: { suggestion: true, option: { select: { publicId: true } } } } }, orderBy: [{ mealDate: "asc" }, { mealType: { displayOrder: "asc" } }] });
    const absences = await prisma.residentFoodUnavailability.findMany({ where: { organizationId: stay.organizationId, residentStayId: stay.id, propertyId: stay.propertyId, cancelledAt: null, endsOn: { gte: today } }, select: { startsOn: true, endsOn: true } });
    return polls.filter((poll) => poll.opensAt <= new Date() && !absences.some((absence) => absence.startsOn <= poll.mealDate && absence.endsOn >= poll.mealDate)).map((poll) => ({ ...poll, selectedOptionId: poll.votes[0]?.option.publicId ?? "", selectedSuggestion: poll.votes[0]?.suggestion ?? "" }));
  },

  async listAvailabilityForResident(actor: OrganizationActor) {
    const stay = await currentResidentFoodStay(actor);
    if (!stay) return [];
    const today = day(localToday(actor.organizationTimezone));
    return prisma.residentFoodUnavailability.findMany({
      where: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentStayId: stay.id, cancelledAt: null, endsOn: { gte: today } },
      select: { publicId: true, startsOn: true, endsOn: true },
      orderBy: [{ startsOn: "asc" }, { id: "asc" }],
    });
  },

  async saveAvailabilityForResident(actor: OrganizationActor, input: ResidentFoodAvailabilityInput) {
    const stay = await currentResidentFoodStay(actor);
    if (!stay) throw new AccessDeniedError();
    const today = day(localToday(actor.organizationTimezone));
    const startsOn = day(input.startsOn);
    const endsOn = day(input.endsOn);
    if (endsOn < today || (stay.endDate && endsOn > stay.endDate)) throw new Error("FOOD_AVAILABILITY_OUTSIDE_STAY");
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM resident_stays WHERE organization_id = ${stay.organizationId} AND id = ${stay.id} FOR UPDATE`;
      let existingStartsOn: Date | null = null;
      if (input.availabilityId) {
        const existing = await tx.residentFoodUnavailability.findFirst({ where: { publicId: input.availabilityId, organizationId: stay.organizationId, residentStayId: stay.id, cancelledAt: null }, select: { id: true, startsOn: true } });
        if (!existing) throw new Error("FOOD_AVAILABILITY_NOT_FOUND");
        existingStartsOn = existing.startsOn;
      }
      const isPastStartDate = startsOn < today;
      const hasImmutablePastStart = existingStartsOn !== null && existingStartsOn < today;
      const preservesPastStart = existingStartsOn !== null && existingStartsOn < today && startsOn.getTime() === existingStartsOn.getTime();
      if ((isPastStartDate && !preservesPastStart) || (hasImmutablePastStart && !preservesPastStart)) throw new Error("FOOD_AVAILABILITY_OUTSIDE_STAY");
      const overlapping = await tx.residentFoodUnavailability.findFirst({
        where: {
          organizationId: stay.organizationId,
          residentStayId: stay.id,
          cancelledAt: null,
          startsOn: { lte: endsOn },
          endsOn: { gte: startsOn },
          ...(input.availabilityId ? { publicId: { not: input.availabilityId } } : {}),
        },
        select: { id: true },
      });
      if (overlapping) throw new Error("FOOD_AVAILABILITY_OVERLAP");
      if (input.availabilityId) {
        return tx.residentFoodUnavailability.update({ where: { publicId: input.availabilityId }, data: { startsOn, endsOn }, select: { publicId: true, startsOn: true, endsOn: true } });
      }
      return tx.residentFoodUnavailability.create({
        data: { organizationId: stay.organizationId, propertyId: stay.propertyId, residentStayId: stay.id, startsOn, endsOn },
        select: { publicId: true, startsOn: true, endsOn: true },
      });
    });
  },

  async cancelAvailabilityForResident(actor: OrganizationActor, availabilityPublicId: string) {
    const stay = await currentResidentFoodStay(actor);
    if (!stay) throw new AccessDeniedError();
    const result = await prisma.residentFoodUnavailability.updateMany({
      where: { publicId: availabilityPublicId, organizationId: stay.organizationId, propertyId: stay.propertyId, residentStayId: stay.id, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });
    if (result.count !== 1) throw new Error("FOOD_AVAILABILITY_NOT_FOUND");
  },

  async listMenusForResident(actor: OrganizationActor) {
    if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
    const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, status: "ACTIVE", user: { publicId: actor.userId }, residentId: { not: null }, roles: { some: { roleCode: "RESIDENT" } } }, select: { residentId: true } });
    if (!membership?.residentId) return [];
    const todayString = localToday(actor.organizationTimezone);
    const today = day(todayString);
    const stay = await prisma.residentStay.findFirst({ where: { organization: { publicId: actor.organizationId }, residentId: membership.residentId, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { propertyId: true, endDate: true }, orderBy: { startDate: "desc" } });
    if (!stay) return [];
    const fourteenDays = day(todayString);
    fourteenDays.setUTCDate(fourteenDays.getUTCDate() + 13);
    const endDate = stay.endDate && stay.endDate < fourteenDays ? stay.endDate : fourteenDays;
    return prisma.foodMenu.findMany({ where: { organization: { publicId: actor.organizationId }, propertyId: stay.propertyId, status: "PUBLISHED", validFrom: { lte: endDate }, validTo: { gte: today } }, select: { publicId: true, title: true, validFrom: true, validTo: true, items: { where: { menuDate: { gte: today, lte: endDate } }, select: { menuDate: true, dishName: true, description: true, mealType: { select: { name: true } } }, orderBy: [{ menuDate: "asc" }, { mealType: { displayOrder: "asc" } }, { id: "asc" }] } }, orderBy: [{ validFrom: "asc" }, { createdAt: "asc" }] });
  },

  async vote(actor: OrganizationActor, input: VoteInput) {
    if (!actor.roles.includes("RESIDENT") || !actor.userEmail) throw new AccessDeniedError();
    const membership = await prisma.organizationMembership.findFirst({ where: { organization: { publicId: actor.organizationId }, status: "ACTIVE", user: { publicId: actor.userId }, residentId: { not: null }, roles: { some: { roleCode: "RESIDENT" } } }, select: { residentId: true } });
    if (!membership?.residentId) throw new AccessDeniedError();
    const today = day(localToday(actor.organizationTimezone));
    const stay = await prisma.residentStay.findFirst({ where: { organization: { publicId: actor.organizationId }, residentId: membership.residentId, status: { in: ["ACTIVE", "NOTICE_PERIOD"] }, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] }, select: { id: true, propertyId: true, endDate: true } });
    if (!stay) throw new AccessDeniedError();
    const organization = await prisma.organization.findUniqueOrThrow({ where: { publicId: actor.organizationId }, select: { id: true } });
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM food_polls WHERE public_id = ${input.pollId} AND organization_id = ${organization.id} AND status = 'OPEN' AND opens_at <= UTC_TIMESTAMP(3) AND closes_at > UTC_TIMESTAMP(3) FOR UPDATE`;
      if (!locked.length) throw new Error("POLL_CLOSED");
      const poll = await tx.foodPoll.findFirst({ where: { id: locked[0].id, organizationId: organization.id, propertyId: stay.propertyId, mealDate: { gte: today, ...(stay.endDate ? { lte: stay.endDate } : {}) }, options: { some: { publicId: input.optionId } } }, select: { id: true, mealDate: true, options: { where: { publicId: input.optionId }, select: { id: true, label: true } } } });
      if (!poll || !poll.options.length) throw new Error("INVALID_POLL_OPTION");
      const unavailable = await tx.residentFoodUnavailability.findFirst({ where: { organizationId: organization.id, residentStayId: stay.id, cancelledAt: null, startsOn: { lte: poll.mealDate }, endsOn: { gte: poll.mealDate } }, select: { id: true } });
      if (unavailable) throw new Error("RESIDENT_AWAY");
      const isNotEating = isWillNotEatOption(poll.options[0].label);
      if (isNotEating && !input.suggestion) throw new Error("FOOD_SUGGESTION_REQUIRED");
      const updated = await tx.foodVote.upsert({ where: { pollId_residentStayId: { pollId: poll.id, residentStayId: stay.id } }, create: { organizationId: organization.id, pollId: poll.id, residentStayId: stay.id, optionId: poll.options[0].id, suggestion: isNotEating ? input.suggestion : null }, update: { optionId: poll.options[0].id, suggestion: isNotEating ? input.suggestion : null, votedAt: new Date() } });
      return updated;
    });
    return result;
  },
};
