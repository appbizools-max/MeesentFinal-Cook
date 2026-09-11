import * as geofire from 'geofire-common';

/**
 * Wrapper for geofire-common helpers.
 */
export const geofireHelper = {
  /**
   * Encodes a location [latitude, longitude] to a geohash.
   */
  encodeLocation(lat: number, lng: number): string {
    return geofire.geohashForLocation([lat, lng]);
  },

  /**
   * Computes the geohash query bounds for a search center and radius in meters.
   * Returns list of query bounds: [ [startGeohash, endGeohash], ... ]
   */
  getQueryBounds(center: [number, number], radiusInMeters: number): geofire.GeohashRange[] {
    return geofire.geohashQueryBounds(center, radiusInMeters);
  },

  /**
   * Calculates the great-circle distance in kilometers between two points.
   */
  getDistanceInKm(pointA: [number, number], pointB: [number, number]): number {
    return geofire.distanceBetween(pointA, pointB);
  }
};
