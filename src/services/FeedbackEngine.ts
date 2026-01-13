import {
  FeedbackRating,
  WakePrediction,
} from '../models/types';
import { storageService } from './StorageService';

interface FeedbackStats {
  totalRatings: number;
  averageFeeling: number;
  averageAlertness: number | null;
  predictionAccuracy: number; // % of times user felt good when using prediction
  improvementTrend: number; // Positive = improving over time
}

class FeedbackEngine {
  // Create a new feedback rating after wake
  async createFeedbackEntry(
    prediction: WakePrediction,
    actualWakeTime: Date,
    usedPrediction: boolean
  ): Promise<FeedbackRating> {
    const rating: FeedbackRating = {
      id: `feedback_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      wakeTime: actualWakeTime,
      predictedWakeTime: prediction.predictedWakeTime,
      actualConfidence: prediction.confidence,
      immediateFeeling: 3, // Default, will be updated by user
      usedPrediction,
    };

    return rating;
  }

  // Save user's rating
  async submitRating(
    rating: FeedbackRating,
    immediateFeeling: number,
    alertnessAfter30Min?: number
  ): Promise<void> {
    const updatedRating: FeedbackRating = {
      ...rating,
      immediateFeeling,
      alertnessAfter30Min,
    };

    await storageService.addFeedbackRating(updatedRating);
  }

  // Get feedback statistics
  async getStats(): Promise<FeedbackStats> {
    const ratings = await storageService.getFeedbackRatings();

    if (ratings.length === 0) {
      return {
        totalRatings: 0,
        averageFeeling: 0,
        averageAlertness: null,
        predictionAccuracy: 0,
        improvementTrend: 0,
      };
    }

    // Calculate averages
    const avgFeeling =
      ratings.reduce((sum, r) => sum + r.immediateFeeling, 0) / ratings.length;

    const alertnessRatings = ratings.filter((r) => r.alertnessAfter30Min !== undefined);
    const avgAlertness =
      alertnessRatings.length > 0
        ? alertnessRatings.reduce((sum, r) => sum + (r.alertnessAfter30Min || 0), 0) /
          alertnessRatings.length
        : null;

    // Calculate prediction accuracy (% good ratings when using prediction)
    const predictionRatings = ratings.filter((r) => r.usedPrediction);
    const goodPredictionRatings = predictionRatings.filter(
      (r) => r.immediateFeeling >= 4
    );
    const predictionAccuracy =
      predictionRatings.length > 0
        ? (goodPredictionRatings.length / predictionRatings.length) * 100
        : 0;

    // Calculate improvement trend (compare first half to second half)
    const improvementTrend = this.calculateTrend(ratings);

    return {
      totalRatings: ratings.length,
      averageFeeling: Math.round(avgFeeling * 10) / 10,
      averageAlertness: avgAlertness ? Math.round(avgAlertness * 10) / 10 : null,
      predictionAccuracy: Math.round(predictionAccuracy),
      improvementTrend,
    };
  }

  private calculateTrend(ratings: FeedbackRating[]): number {
    if (ratings.length < 6) return 0;

    // Sort by date
    const sorted = [...ratings].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstAvg =
      firstHalf.reduce((sum, r) => sum + r.immediateFeeling, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, r) => sum + r.immediateFeeling, 0) / secondHalf.length;

    // Return difference as percentage points
    return Math.round((secondAvg - firstAvg) * 20); // Scale to -100 to +100
  }

  // Get insights based on feedback
  async getInsights(): Promise<string[]> {
    const ratings = await storageService.getFeedbackRatings();
    const insights: string[] = [];

    if (ratings.length < 7) {
      insights.push(
        `Keep rating your wake quality! ${7 - ratings.length} more days until personalized insights.`
      );
      return insights;
    }

    const stats = await this.getStats();

    // Insight about overall feeling
    if (stats.averageFeeling >= 4) {
      insights.push('You generally wake up feeling good! The predictions are working well.');
    } else if (stats.averageFeeling <= 2.5) {
      insights.push(
        'Your wake quality could be better. Consider going to bed earlier or checking your sleep environment.'
      );
    }

    // Insight about prediction accuracy
    if (stats.predictionAccuracy >= 70) {
      insights.push(
        `Predictions are ${stats.predictionAccuracy}% accurate at helping you wake refreshed.`
      );
    } else if (stats.predictionAccuracy < 50 && stats.predictionAccuracy > 0) {
      insights.push(
        'Predictions are still learning your patterns. Accuracy will improve with more data.'
      );
    }

    // Insight about trend
    if (stats.improvementTrend > 10) {
      insights.push('Your wake quality has been improving over time!');
    } else if (stats.improvementTrend < -10) {
      insights.push(
        'Wake quality has decreased recently. Any changes to your sleep schedule or habits?'
      );
    }

    // Insight about alertness
    if (stats.averageAlertness !== null) {
      if (stats.averageAlertness >= 4) {
        insights.push('You maintain good alertness after waking. Great sleep hygiene!');
      } else if (stats.averageAlertness <= 2.5) {
        insights.push(
          'Your alertness 30 minutes after waking is low. Consider exposure to bright light or movement.'
        );
      }
    }

    return insights.length > 0
      ? insights
      : ['Keep tracking to unlock personalized insights!'];
  }

  // Determine if algorithm should be more or less aggressive
  async getAlgorithmAdjustments(): Promise<{
    confidenceMultiplier: number;
    preferEarlierWake: boolean;
  }> {
    const ratings = await storageService.getFeedbackRatings();

    if (ratings.length < 14) {
      return { confidenceMultiplier: 1, preferEarlierWake: false };
    }

    const recentRatings = ratings.slice(-14);

    // If users consistently rate poorly when using predictions, reduce confidence
    const predictionRatings = recentRatings.filter((r) => r.usedPrediction);
    const avgPredictionFeeling =
      predictionRatings.length > 0
        ? predictionRatings.reduce((sum, r) => sum + r.immediateFeeling, 0) /
          predictionRatings.length
        : 3;

    // If users rate better on fallback times, maybe predictions are off
    const fallbackRatings = recentRatings.filter((r) => !r.usedPrediction);
    const avgFallbackFeeling =
      fallbackRatings.length > 0
        ? fallbackRatings.reduce((sum, r) => sum + r.immediateFeeling, 0) /
          fallbackRatings.length
        : 3;

    let confidenceMultiplier = 1;
    if (avgPredictionFeeling < avgFallbackFeeling - 0.5) {
      // Predictions are worse than fallback, be more conservative
      confidenceMultiplier = 0.8;
    } else if (avgPredictionFeeling > avgFallbackFeeling + 0.5) {
      // Predictions are better, be more confident
      confidenceMultiplier = 1.1;
    }

    // Check if earlier wake times correlate with better feelings
    // (This would need more sophisticated time-based analysis)
    const preferEarlierWake = false; // Placeholder for future enhancement

    return { confidenceMultiplier, preferEarlierWake };
  }
}

export const feedbackEngine = new FeedbackEngine();
