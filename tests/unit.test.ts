import { describe, it, expect } from "vitest";
import { dataSchema, search, distance } from "../lib/data";
import raw from "../data/campus-locations.json";
const places = dataSchema.parse(raw);
describe("campus directory", () => {
  it("finds partial words without case sensitivity", () => {
    expect(
      search(places, "hOsT").every(
        (p) => p.name.toLowerCase().includes("host") || p.category === "hostel",
      ),
    ).toBe(true);
    expect(search(places, "hOsT").length).toBeGreaterThan(0);
  });
  it("ranks exact names first", () => {
    expect(search(places, "Car Parking – AIT")[0].id).toBe("car-parking");
  });
  it("searches descriptions, buildings, categories and Marathi", () => {
    const custom = {
      ...places[0],
      nameMr: "प्रवेश",
      building: "Block Z",
      description: "Welcome desk",
    };
    for (const q of ["प्रवेश", "block z", "welcome", "academic"])
      expect(search([custom], q)).toEqual([custom]);
  });
  it("filters categories and combines with search", () => {
    expect(search(places, "", ["hostel"])).toHaveLength(3);
    expect(search(places, "old", ["hostel"])[0].id).toBe("old-boys-hostel");
    expect(search(places, "library", ["hostel"])).toEqual([]);
  });
  it("calculates distances in meters symmetrically", () => {
    const a = { lat: 0, lng: 0 },
      b = { lat: 0, lng: 1 };
    expect(distance(a, a)).toBe(0);
    expect(distance(a, b)).toBeCloseTo(111194.93, 1);
    expect(distance(a, b)).toBe(distance(b, a));
  });
  it("rejects duplicate ids, missing coordinate pairs and invalid verification", () => {
    expect(dataSchema.safeParse([places[0], places[0]]).success).toBe(false);
    expect(dataSchema.safeParse([{ ...places[0], lat: null }]).success).toBe(
      false,
    );
    expect(
      dataSchema.safeParse([
        { ...places[0], lat: null, lng: null, verified: true },
      ]).success,
    ).toBe(false);
  });
});
