import { Injectable } from '@nestjs/common';

export interface GpsValidationResult {
  allowed: boolean;
  reason?: 'OUTSIDE_CHECKIN_RADIUS' | 'GPS_ACCURACY_UNRELIABLE';
  distanceMeters: number;
  message?: string;
}

@Injectable()
export class GpsValidationService {
  /**
   * Calculates the Haversine distance in meters between two lat/lng coordinates.
   */
  calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Evaluates member location against branch location and allowed radius.
   */
  evaluateLocation(
    memberLat: number,
    memberLng: number,
    accuracyMeters: number,
    branchLat: number,
    branchLng: number,
    radiusMeters: number = 100,
  ): GpsValidationResult {
    const distanceMeters = this.calculateHaversineDistanceMeters(memberLat, memberLng, branchLat, branchLng);

    // Reject clearly unreliable location accuracy (e.g. > 300m or > 3x radius)
    const maxAllowedAccuracy = Math.max(200, radiusMeters * 2);
    if (accuracyMeters > maxAllowedAccuracy) {
      return {
        allowed: false,
        reason: 'GPS_ACCURACY_UNRELIABLE',
        distanceMeters,
        message: 'Location signal is not accurate enough. Please enable High Accuracy location and try again.',
      };
    }

    if (distanceMeters <= radiusMeters) {
      return {
        allowed: true,
        distanceMeters,
      };
    }

    return {
      allowed: false,
      reason: 'OUTSIDE_CHECKIN_RADIUS',
      distanceMeters,
      message: "You're outside the gym's check-in area. Move closer to the gym and try again.",
    };
  }
}
