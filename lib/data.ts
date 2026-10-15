import { z } from "zod";
export const categories = [
  "department",
  "hostel",
  "canteen",
  "admin",
  "library",
  "academic",
  "sports",
  "medical",
  "parking",
  "gate",
  "transport",
  "utility",
  "other",
] as const;
export const locationSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    nameMr: z.string().optional(),
    category: z.enum(categories),
    building: z.string(),
    floor: z.string().optional(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    hours: z.string().optional(),
    contact: z.string().optional(),
    description: z.string().optional(),
    accessible: z.boolean(),
    source: z.string().min(1),
    verified: z.boolean(),
  })
  .superRefine((x, ctx) => {
    if ((x.lat === null) !== (x.lng === null))
      ctx.addIssue({
        code: "custom",
        message: "Both coordinates must be supplied together",
      });
    if (x.verified && x.lat === null)
      ctx.addIssue({
        code: "custom",
        message: "Verified locations require coordinates",
      });
  });
export const dataSchema = z.array(locationSchema).superRefine((xs, ctx) => {
  const ids = new Set();
  xs.forEach((x, i) => {
    if (ids.has(x.id))
      ctx.addIssue({
        code: "custom",
        path: [i, "id"],
        message: "Duplicate location ID",
      });
    ids.add(x.id);
  });
});
export type Place = z.infer<typeof locationSchema>;
export type Category = (typeof categories)[number];
export function distance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r,
    dLng = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function search(
  places: Place[],
  query: string,
  filters: Category[] = [],
) {
  const q = query.trim().toLocaleLowerCase();
  return places
    .filter(
      (p) =>
        (!filters.length || filters.includes(p.category)) &&
        [p.name, p.nameMr, p.building, p.category, p.description].some((v) =>
          v?.toLocaleLowerCase().includes(q),
        ),
    )
    .sort(
      (a, b) =>
        Number(
          b.name.toLocaleLowerCase() === q ||
            b.nameMr?.toLocaleLowerCase() === q,
        ) -
          Number(
            a.name.toLocaleLowerCase() === q ||
              a.nameMr?.toLocaleLowerCase() === q,
          ) || a.name.localeCompare(b.name),
    );
}
