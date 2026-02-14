
import { db } from './firebase.config';
import { doc, updateDoc, arrayUnion, runTransaction, serverTimestamp, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getNextBestArtisan } from './recommendation.service';
import { Order } from '../types';

/**
 * Rejects a specific quote from an artisan.
 */
export const rejectQuote = async (orderId: string, artisanId: string, quoteId: string) => {
  try {
    const quoteRef = doc(db, "orders", orderId, "quotes", quoteId);
    await updateDoc(quoteRef, {
      status: 'rejected'
    });

    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      rejectedArtisanIds: arrayUnion(artisanId)
    });

    await getNextBestArtisan(orderId);

    return true;
  } catch (error) {
    console.error("Failed to reject quote and replace:", error);
    throw error;
  }
};

/**
 * Archives an order using a Transaction.
 * 1. Creates a Review document.
 * 2. Updates Artisan stats (rating, count).
 * 3. Moves Order to archivedOrders.
 * 4. Deletes active Order.
 */
export const archiveOrder = async (order: Order, review?: { rating: number, comment: string, images?: string[] }) => {
  const artisanRef = doc(db, "artisans", order.artisanId!);
  const orderRef = doc(db, "orders", order.id);
  const archiveRef = doc(db, "archivedOrders", order.id);

  // Use a time-based ID for easier sorting later without composite indexes
  const reviewId = `rev-${Date.now()}`;
  const reviewRef = doc(collection(db, "reviews"), reviewId);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Read Operations
      const artisanDoc = await transaction.get(artisanRef);
      if (!artisanDoc.exists()) {
        throw new Error("Artisan does not exist!");
      }

      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) {
        throw new Error("Order does not exist in active orders!");
      }

      const artisanData = artisanDoc.data();
      const orderData = orderDoc.data();

      // 2. Calculate New Stats
      const currentRating = artisanData.rating || 0;
      const currentCount = artisanData.reviewsCount || 0;
      const currentJobs = artisanData.jobsDone || 0;

      let newRating = currentRating;
      let newCount = currentCount;

      // Only update stats if a review is provided
      if (review) {
        newCount = currentCount + 1;
        // Formula: ((oldAverage * oldcount) + newRating) / (oldcount + 1)
        newRating = ((currentRating * currentCount) + review.rating) / newCount;
      }

      // 3. Write Review (if provided)
      if (review) {
        transaction.set(reviewRef, {
          id: reviewId,
          artisanId: order.artisanId,
          orderId: order.id,
          userId: order.userId,
          rating: review.rating,
          comment: review.comment,
          images: review.images || [], // Store review images
          createdAt: serverTimestamp(),
          userName: 'Client Vork', // In production, fetch user profile
          userAvatar: 'CV',
          date: new Date().toLocaleDateString() // Simple string for UI fallback
        });
      }

      // 4. Archive Order
      transaction.set(archiveRef, {
        ...orderData,
        status: 'Terminé',
        completedAt: serverTimestamp(),
        archivedAt: serverTimestamp(),
        finishRequestedBy: 'client',
        reviewId: review ? reviewId : null,
        resultImages: review?.images || [], // Store result images explicitly
        // We keep finalReview on the order object too for easier Portfolio display
        finalReview: review || null
      });

      // 5. Update Artisan Stats
      transaction.update(artisanRef, {
        rating: Number(newRating.toFixed(2)),
        reviewsCount: newCount,
        jobsDone: currentJobs + 1
      });

      // 6. Delete Active Order
      transaction.delete(orderRef);
    });

    console.log("Order successfully archived with transaction.");
  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e;
  }
};
