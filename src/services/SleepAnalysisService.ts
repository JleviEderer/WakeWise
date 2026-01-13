import {
  SleepSession,
  SleepPattern,
  TimeWindow,
  SleepStageType,
} from '../models/types';
import { SLEEP_ANALYSIS } from '../constants/config';
import { storageService } from './StorageService';

class SleepAnalysisService {
  // Analyze sleep patterns from historical data
  async analyzePatterns(): Promise<SleepPattern | null> {
    const sessions = await storageService.getSleepSessions();

    if (sessions.length < SLEEP_ANALYSIS.MIN_DATA_DAYS) {
      return null;
    }

    // Calculate average sleep duration
    const avgDuration = this.calculateAverageDuration(sessions);

    // Detect sleep cycle length
    const avgCycleLength = this.detectCycleLength(sessions);

    // Find typical light sleep windows
    const lightSleepWindows = this.findLightSleepWindows(sessions);

    // Calculate pattern consistency
    const consistency = this.calculateConsistency(sessions);

    return {
      averageSleepDuration: avgDuration,
      averageCycleLength: avgCycleLength,
      typicalLightSleepWindows: lightSleepWindows,
      consistency,
      dataPoints: sessions.length,
    };
  }

  private calculateAverageDuration(sessions: SleepSession[]): number {
    const total = sessions.reduce((sum, s) => sum + s.totalDurationMinutes, 0);
    return Math.round(total / sessions.length);
  }

  private detectCycleLength(sessions: SleepSession[]): number {
    // Analyze transitions from deep sleep back to light sleep
    // A complete cycle typically goes: light -> deep -> light -> REM
    const cycleLengths: number[] = [];

    for (const session of sessions) {
      if (!session.stages || session.stages.length < 4) continue;

      let cycleStart: Date | null = null;
      let inDeepSleep = false;

      for (const stage of session.stages) {
        if (stage.type === 'light' && !inDeepSleep && !cycleStart) {
          // Start of a potential cycle
          cycleStart = stage.startTime;
        } else if (stage.type === 'deep') {
          inDeepSleep = true;
        } else if (stage.type === 'light' && inDeepSleep && cycleStart) {
          // End of cycle - back to light sleep after deep
          const cycleLength =
            (stage.startTime.getTime() - cycleStart.getTime()) / 60000;

          // Only count reasonable cycle lengths (60-120 min)
          if (cycleLength >= 60 && cycleLength <= 120) {
            cycleLengths.push(cycleLength);
          }

          // Reset for next cycle
          cycleStart = stage.startTime;
          inDeepSleep = false;
        }
      }
    }

    if (cycleLengths.length === 0) {
      return SLEEP_ANALYSIS.AVERAGE_CYCLE_LENGTH;
    }

    // Return median to avoid outlier influence
    cycleLengths.sort((a, b) => a - b);
    const mid = Math.floor(cycleLengths.length / 2);
    return Math.round(cycleLengths[mid]);
  }

  private findLightSleepWindows(sessions: SleepSession[]): TimeWindow[] {
    // Create a histogram of when light sleep occurs relative to sleep start
    const bucketSizeMinutes = 15;
    const maxMinutes = 600; // 10 hours
    const lightSleepBuckets: number[] = new Array(
      Math.ceil(maxMinutes / bucketSizeMinutes)
    ).fill(0);
    const totalBuckets: number[] = new Array(lightSleepBuckets.length).fill(0);

    for (const session of sessions) {
      if (!session.stages) continue;

      for (const stage of session.stages) {
        const minutesFromSleep =
          (stage.startTime.getTime() - session.sleepStart.getTime()) / 60000;

        if (minutesFromSleep < 0 || minutesFromSleep >= maxMinutes) continue;

        const bucketIndex = Math.floor(minutesFromSleep / bucketSizeMinutes);

        if (bucketIndex < lightSleepBuckets.length) {
          totalBuckets[bucketIndex]++;
          if (stage.type === 'light') {
            lightSleepBuckets[bucketIndex]++;
          }
        }
      }
    }

    // Find windows with high light sleep probability
    const windows: TimeWindow[] = [];
    let windowStart: number | null = null;
    const threshold = 0.4; // 40% or more in light sleep

    for (let i = 0; i < lightSleepBuckets.length; i++) {
      const probability =
        totalBuckets[i] > 0 ? lightSleepBuckets[i] / totalBuckets[i] : 0;

      if (probability >= threshold) {
        if (windowStart === null) {
          windowStart = i * bucketSizeMinutes;
        }
      } else if (windowStart !== null) {
        windows.push({
          startMinutesFromSleep: windowStart,
          endMinutesFromSleep: i * bucketSizeMinutes,
          probability:
            lightSleepBuckets.slice(
              Math.floor(windowStart / bucketSizeMinutes),
              i
            ).reduce((a, b) => a + b, 0) /
            totalBuckets.slice(
              Math.floor(windowStart / bucketSizeMinutes),
              i
            ).reduce((a, b) => a + b, 1),
        });
        windowStart = null;
      }
    }

    // Close any open window
    if (windowStart !== null) {
      windows.push({
        startMinutesFromSleep: windowStart,
        endMinutesFromSleep: maxMinutes,
        probability: 0.5,
      });
    }

    return windows;
  }

  private calculateConsistency(sessions: SleepSession[]): number {
    if (sessions.length < 3) return 0;

    // Check consistency of:
    // 1. Sleep duration variation
    // 2. Bedtime variation
    // 3. Wake time variation

    const durations = sessions.map((s) => s.totalDurationMinutes);
    const bedtimes = sessions.map((s) => this.getMinuteOfDay(s.sleepStart));
    const waketimes = sessions.map((s) => this.getMinuteOfDay(s.sleepEnd));

    const durationVariation = this.calculateVariation(durations);
    const bedtimeVariation = this.calculateVariation(bedtimes);
    const waketimeVariation = this.calculateVariation(waketimes);

    // Lower variation = higher consistency
    // Scale: 0-100, where 100 is perfectly consistent
    const maxAcceptableVariation = 60; // 60 minutes standard deviation is acceptable

    const durationScore = Math.max(
      0,
      100 - (durationVariation / maxAcceptableVariation) * 50
    );
    const bedtimeScore = Math.max(
      0,
      100 - (bedtimeVariation / maxAcceptableVariation) * 50
    );
    const waketimeScore = Math.max(
      0,
      100 - (waketimeVariation / maxAcceptableVariation) * 50
    );

    return Math.round((durationScore + bedtimeScore + waketimeScore) / 3);
  }

  private getMinuteOfDay(date: Date): number {
    // Handle midnight crossing by using relative to 4am
    const hours = date.getHours();
    const minutes = date.getMinutes();
    let minuteOfDay = hours * 60 + minutes;

    // If before 4am, add 24 hours worth of minutes to make comparison easier
    if (hours < 4) {
      minuteOfDay += 24 * 60;
    }

    return minuteOfDay;
  }

  private calculateVariation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  // Get the most likely sleep stage at a given time relative to sleep start
  getMostLikelyStage(
    minutesFromSleepStart: number,
    pattern: SleepPattern
  ): { stage: SleepStageType; probability: number } {
    // Check if in a known light sleep window
    for (const window of pattern.typicalLightSleepWindows) {
      if (
        minutesFromSleepStart >= window.startMinutesFromSleep &&
        minutesFromSleepStart <= window.endMinutesFromSleep
      ) {
        return { stage: 'light', probability: window.probability };
      }
    }

    // Use cycle-based estimation
    const cycleLength = pattern.averageCycleLength;
    const positionInCycle = minutesFromSleepStart % cycleLength;
    const cyclePercentage = positionInCycle / cycleLength;

    // Typical cycle structure:
    // 0-20%: Light sleep (transition in)
    // 20-50%: Deep sleep
    // 50-75%: Light sleep (transition)
    // 75-100%: REM

    if (cyclePercentage < 0.2) {
      return { stage: 'light', probability: 0.6 };
    } else if (cyclePercentage < 0.5) {
      return { stage: 'deep', probability: 0.5 };
    } else if (cyclePercentage < 0.75) {
      return { stage: 'light', probability: 0.5 };
    } else {
      return { stage: 'rem', probability: 0.5 };
    }
  }
}

export const sleepAnalysisService = new SleepAnalysisService();
