"use client";

import Link from "next/link";
import { useState } from "react";
import type { PropertySummary } from "@/modules/property/domain/inventory";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import styles from "./owner-dashboard.module.css";

const numberFormat = new Intl.NumberFormat("en-IN");

export function PropertyPerformance({
  orgId,
  properties,
  searchTerm,
}: Readonly<{ orgId: string; properties: readonly PropertySummary[]; searchTerm: string }>) {
  const [view, setView] = useState<"grid" | "table">("grid");

  return (
    <>
      <div className={styles.propertySectionHeading}>
        <div>
          <div className={styles.titleWithIcon}>
            <WorkspaceIcon name="apartment" />
            <h2 id="property-performance-heading">Your properties</h2>
          </div>
          <p>Property status and configured inventory across this organization.</p>
        </div>
        <div className={styles.propertyHeadingActions}>
          <div aria-label="Property display mode" className={styles.viewToggle} role="group">
            <button aria-pressed={view === "grid"} className={view === "grid" ? styles.viewButtonActive : styles.viewButton} onClick={() => setView("grid")} type="button">
              <WorkspaceIcon name="grid_view" />Grid
            </button>
            <button aria-pressed={view === "table"} className={view === "table" ? styles.viewButtonActive : styles.viewButton} onClick={() => setView("table")} type="button">
              <WorkspaceIcon name="table_rows" />Table
            </button>
          </div>
          <Link className={styles.secondaryButton} href={`/org/${orgId}/properties`}>
            <span>View all properties</span><span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      {searchTerm ? (
        <p aria-live="polite" className={styles.searchSummary}>
          {properties.length} {properties.length === 1 ? "property" : "properties"} matching “{searchTerm}”
          <Link href={`/org/${orgId}/owner`}>Clear search</Link>
        </p>
      ) : null}
      {properties.length ? (
        view === "grid" ? (
          <div className={styles.propertyCards}>
            {properties.map((property) => <PropertyCard key={property.id} orgId={orgId} property={property} />)}
          </div>
        ) : (
          <div className={styles.propertyTableScroller}>
            <table className={styles.propertyTable}>
              <thead>
                <tr><th scope="col">Property</th><th scope="col">Location</th><th scope="col">Status</th><th scope="col">Floors</th><th scope="col">Rooms</th><th scope="col">Beds</th></tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td><Link className={styles.propertyTableName} href={`/org/${orgId}/properties/${property.id}`}>{property.name}{property.code ? <small>{property.code}</small> : null}</Link></td>
                    <td>{property.addressLine1}, {property.city}, {property.state}</td>
                    <td><span className={property.status === "ACTIVE" ? styles.statusActive : styles.statusInactive}><i aria-hidden="true" />{property.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
                    <td>{numberFormat.format(property.floorCount)}</td><td>{numberFormat.format(property.roomCount)}</td><td>{numberFormat.format(property.bedCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className={styles.propertiesEmpty}>
          <WorkspaceIcon name="apartment" />
          <strong>{searchTerm ? "No properties match this search" : "Your portfolio starts with a property"}</strong>
          <p>{searchTerm ? "Try a property name, code, city, or address." : "Add a property, then configure its floors, rooms, and beds."}</p>
          {searchTerm ? null : <Link className={styles.primaryButton} href={`/org/${orgId}/properties/new`}>Add your first property</Link>}
        </div>
      )}
    </>
  );
}

function PropertyCard({
  orgId,
  property,
}: Readonly<{ orgId: string; property: PropertySummary }>) {
  const active = property.status === "ACTIVE";
  return (
    <Link className={styles.propertyCard} href={`/org/${orgId}/properties/${property.id}`}>
      <div className={styles.propertyCardTop}>
        <WorkspaceIcon className={`${styles.propertyIcon} material-symbols-outlined`} name="apartment" />
        <span className={active ? styles.statusActive : styles.statusInactive}><i aria-hidden="true" />{active ? "Active" : "Inactive"}</span>
      </div>
      <div className={styles.propertyNameLine}>
        <h3>{property.name}</h3>
        {property.code ? <span>{property.code}</span> : null}
      </div>
      <p className={styles.propertyLocation}>
        <WorkspaceIcon name="location_on" />
        <span>{property.addressLine1}{property.addressLine2 ? `, ${property.addressLine2}` : ""}, {property.city}, {property.state}</span>
      </p>
      <div className={styles.inventoryCounts}>
        <InventoryCount label="Floors" value={property.floorCount} />
        <InventoryCount label="Rooms" value={property.roomCount} />
        <InventoryCount label="Beds" value={property.bedCount} />
      </div>
      <div className={styles.propertyCardFooter}><span>View property inventory</span><span aria-hidden="true">→</span></div>
    </Link>
  );
}

function InventoryCount({ label, value }: Readonly<{ label: string; value: number }>) {
  return <span><strong>{numberFormat.format(value)}</strong><small>{label}</small></span>;
}
