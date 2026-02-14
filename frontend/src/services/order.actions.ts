
import { db } from './firebase.config';
import { doc, updateDoc, arrayUnion, runTransaction, serverTimestamp, collection, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getNextBestArtisan } from './recommendation.service';
import { Order } from '../types';

/**
 * Rejects a specific quote from an artisan.
 */
export const rejectQuote = async (orderId: string, artisanId: string, quoteId: string) => {
    if (!orderId || !quoteId) {
        console.error("Missing IDs for quote rejection", { orderId, quoteId });
        return false;
    }

    try {
        // 1. Mark the quote as rejected immediately
        const quoteRef = doc(db, "orders", orderId, "quotes", quoteId);
        await updateDoc(quoteRef, {
            status: 'rejected',
            rejectedAt: new Date().toISOString()
        });

        // 2. Add artisan to order's exclusion list
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
            rejectedArtisanIds: arrayUnion(artisanId)
        });

        // 3. Trigger background search for a new expert
        getNextBestArtisan(orderId).catch(err =>
            console.warn("Background replacement search failed:", err.message)
        );

        return true;
    } catch (error) {
        console.error("Failed to reject quote:", error);
        throw error;
    }
};

/**
 * Archives an order using a Transaction.
 */
export const archiveOrder = async (order: Order, review?: { rating: number, comment: string, images?: string[] }) => {
    if (!order.artisanId) throw new Error("Missing artisanId for archiving.");

    const artisanRef = doc(db, "artisans", order.artisanId);
    const orderRef = doc(db, "orders", order.id);
    const archiveRef = doc(db, "archivedOrders", order.id);

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

            if (review) {
                newCount = currentCount + 1;
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
                    images: review.images || [],
                    createdAt: serverTimestamp(),
                    userName: 'Client Vork',
                    userAvatar: 'CV',
                    date: new Date().toLocaleDateString()
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
                resultImages: review?.images || [],
                finalReview: review || null
            });

            // 5. Update Artisan Stats
            transaction.update(artisanRef, {
                rating: Number(newRating.toFixed(2)),
                reviewsCount: newCount,
                jobsDone: currentJobs + 1,
                currentActiveJobs: increment(-1)
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
