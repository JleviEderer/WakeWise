import {
  SleepPattern,
  WakeWindow,
  WakePrediction,
  FeedbackRating,
  SleepStageType,
} from '../models/types';
import { SLEEP_ANALYSIS } from '../constants/config';
import { sleepAnalysisService } from './SleepAnalysisService';
import { storageService } from './StorageService';

class WakePredictorService {
  // Generate a wake prediction for tonight
  async generatePrediction(
    wakeWindow: WakeWindow,
    estimatedBedtime: Date
  ): Promise<WakePrediction> {
    const pattern = await sleepAnalysisService.analyzePatterns();
    const settings = await storageService.getUserSettings();
    const feedback = await storageService.getFeedbackRatings();

    // Parse hard wake time
    const hardWakeTime = this.parseWakeTime(wakeWindow.hardWakeTime, estimatedBedtime);

    // Calculate earliest possible wake time
    const earliestWake = wakeWindow.earliestWakeTime
      ? this.parseWakeTime(wakeWindow.earliestWakeTime, estimatedBedtime)
      : new Date(hardWakeTime.getTime() - wakeWindow.windowDurationMinutes * 60000);

    // If no pattern data, return fallback
    if (!pattern) {
      return {
        predictedWakeTime: hardWakeTime,
        confidence: 0,
        reasoning: 'Not enough sleep data yet. Using your hard wake time.',
        fallbackTime: hardWakeTime,
        predictedStage: 'light',
      };
    }

    // Find optimal wake time within window
    const { optimalTime, stage, baseConfidence } = this.findOptimalWakeTime(
      earliestWake,
      hardWakeTime,
      estimatedBedtime,
      pattern
    );

    // Adjust confidence based on various factors
    const adjustedConfidence = this.adjustConfidence(
      baseConfidence,
      pattern,
      feedback,
      estimatedBedtime
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      optimalTime,
      hardWakeTime,
      stage,
      adjustedConfidence,
      pattern
    );

    return {
      predictedWakeTime: optimalTime,
      confidence: adjustedConfidence,
      reasoning,
      fallbackTime: hardWakeTime,
      predictedStage: stage,
    };
  }

  private parseWakeTime(timeStr: string, referenceDate: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const wakeTime = new Date(referenceDate);

    // Wake time is next day if bedtime is in evening
    if (referenceDate.getHours() >= 18) {
      wakeTime.setDate(wakeTime.getDate() + 1);
    }

    wakeTime.setHours(hours, minutes, 0, 0);
    return wakeTime;
  }

  private findOptimalWakeTime(
    earliestWake: Date,
    latestWake: Date,
    bedtime: Date,
    pattern: SleepPattern
  ): { optimalTime: Date; stage: SleepStageType; baseConfidence: number } {
    const windowDuration = (latestWake.getTime() - earliestWake.getTime()) / 60000;
    const checkInterval = 5; // Check every 5 minutes

    let bestTime = latestWake;
    let bestScore = 0;
    let bestStage: SleepStageType = 'light';

    for (let offset = 0; offset <= windowDuration; offset += checkInterval) {
      const candidateTime = new Date(earliestWake.getTime() + offset * 60000);
      const minutesFromSleep =
        (candidateTime.getTime() - bedtime.getTime()) / 60000;

      const { stage, probability } = sleepAnalysisService.getMostLikelyStage(
        minutesFromSleep,
        pattern
      );

      // Score: prefer light sleep, penalize deep sleep
      let score = 0;
      switch (stage) {
        case 'light':
          score = probability * 100;
          break;
        case 'rem':
          score = probability * 70; // REM is okay but not ideal
          break;
        case 'awake':
          score = probability * 60;
          break;
        case 'deep':
          score = probability * 20; // Strongly avoid deep sleep
          break;
      }

      // Slight preference for earlier times (more buffer)
      score += (windowDuration - offset) / windowDuration * 10;

      if (score > bestScore) {
        bestScore = score;
        bestTime = candidateTime;
        bestStage = stage;
      }
    }

    // Base confidence from score (0-100)
    const baseConfidence = Math.min(
      SLEEP_ANALYSIS.MAX_CONFIDENCE,
      Math.round(bestScore * 0.8)
    );

    return { optimalTime: bestTime, stage: bestStage, baseConfidence };
  }

  private adjustConfidence(
    baseConfidence: number,
    pattern: SleepPattern,
    feedback: FeedbackRating[],
    bedtime: Date
  ): number {
    let confidence = baseConfidence;

    // Boost for more data
    const dataBoost = Math.min(
      20,
      (pattern.dataPoints - SLEEP_ANALYSIS.MIN_DATA_DAYS) *
        SLEEP_ANALYSIS.CONFIDENCE_BOOST_PER_DAY
    );
    confidence += dataBoost;

    // Boost for consistent patterns
    confidence += (pattern.consistency / 100) * 15;

    // Penalty for unusual bedtime
    const typicalBedtimeMinute = this.getTypicalBedtimeMinute(pattern);
    const tonightBedtimeMinute = this.getMinuteOfDay(bedtime);
    const bedtimeDiff = Math.abs(tonightBedtimeMinute - typicalBedtimeMinute);

    if (bedtimeDiff > 60) {
      confidence -= Math.min(30, (bedtimeDiff - 60) / 2);
    }

    // Boost from positive feedback history
    if (feedback.length > 0) {
      const recentFeedback = feedback.slice(-14); // Last 2 weeks
      const avgRating =
        recentFeedback.reduce((sum, f) => sum + f.immediateFeeling, 0) /
        recentFeedback.length;

      if (avgRating >= 4) {
        confidence += 10;
      } else if (avgRating <= 2) {
        confidence -= 10;
      }
    }

    // Clamp to valid range
    return Math.max(0, Math.min(SLEEP_ANALYSIS.MAX_CONFIDENCE, Math.round(confidence)));
  }

  private getTypicalBedtimeMinute(pattern: SleepPattern): number {
    // Estimate typical bedtime from average sleep duration and known wake patterns
    // This is a simplification - could be improved with actual bedtime tracking
    return 23 * 60; // Default to 11pm
  }

  private getMinuteOfDay(date: Date): number {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    let minuteOfDay = hours * 60 + minutes;

    // Handle midnight crossing
    if (hours < 4) {
      minuteOfDay += 24 * 60;
    }

    return minuteOfDay;
  }

  private generateReasoning(
    optimalTime: Date,
    hardWakeTime: Date,
    stage: SleepStageType,
    confidence: number,
    pattern: SleepPattern
  ): string {
    const timeDiff = Math.round(
      (hardWakeTime.getTime() - optimalTime.getTime()) / 60000
    );

    const timeStr = optimalTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (confidence < 30) {
      return `Limited data (${pattern.dataPoints} nights). Prediction is rough estimate.`;
    }

    if (timeDiff === 0) {
      return `Your hard wake time aligns well with your sleep pattern.`;
    }

    const stageDesc = stage === 'light' ? 'light sleep' : `${stage} stage`;

    if (confidence >= 70) {
      return `Based on ${pattern.dataPoints} nights of data, you'll likely be in ${stageDesc} around ${timeStr}, ${timeDiff} min before your deadline.`;
    }

    return `Estimated ${stageDesc} around ${timeStr}. Confidence is moderate due to pattern variability.`;
  }

  // Update prediction weights based on user feedback
  async processNewFeedback(rating: FeedbackRating): Promise<void> {
    // Store the feedback
    await storageService.addFeedbackRating(rating);

    // In a more sophisticated version, this would update ML model weights
    // For MVP, the adjustConfidence method uses historical feedback
  }
}

export const wakePredictorService = new WakePredictorService();
