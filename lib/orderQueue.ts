import { adminDb } from "@/lib/firebaseAdminServer";
import { FieldValue } from "firebase-admin/firestore";

const QUEUE_COLLECTION = "order_processing_queue";
const LOCK_TIMEOUT_MS = 300000; // 5 minuti

export class OrderQueue {
  /**
   * Aggiungi ordine alla coda
   */
  static async enqueue(order: any): Promise<string> {
    const queueRef = adminDb.collection(QUEUE_COLLECTION);
    
    const doc = await queueRef.add({
      order_id: order.id,
      order_number: order.order_number,
      order_data: order,
      status: "pending",
      created_at: new Date().toISOString(),
      attempts: 0,
      locked_at: null,
      locked_by: null,
    });

    console.log(`📥 Ordine #${order.order_number} aggiunto alla coda: ${doc.id}`);
    return doc.id;
  }

  /**
   * Prendi prossimo ordine dalla coda (con lock)
   */
  static async dequeue(): Promise<{ id: string; order: any } | null> {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() - LOCK_TIMEOUT_MS);

    // Trova primo ordine disponibile
    const queueRef = adminDb.collection(QUEUE_COLLECTION);
    const snapshot = await queueRef
      .where("status", "==", "pending")
      .orderBy("created_at", "asc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Cerca ordini locked ma scaduti (retry)
      const staleSnapshot = await queueRef
        .where("status", "==", "processing")
        .where("locked_at", "<", lockExpiry.toISOString())
        .limit(1)
        .get();

      if (staleSnapshot.empty) {
        return null;
      }

      const staleDoc = staleSnapshot.docs[0];
      console.log(`🔓 Unlock ordine scaduto: ${staleDoc.data().order_number}`);
      
      await staleDoc.ref.update({
        status: "pending",
        locked_at: null,
        locked_by: null,
      });

      return null; // Riprova nel prossimo ciclo
    }

    const doc = snapshot.docs[0];
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Acquisisci lock
    try {
      await doc.ref.update({
        status: "processing",
        locked_at: now.toISOString(),
        locked_by: workerId,
        attempts: FieldValue.increment(1),
      });

      return {
        id: doc.id,
        order: doc.data().order_data,
      };
    } catch (err) {
      console.log(`⚠️ Failed to acquire lock`);
      return null;
    }
  }

  /**
   * Marca ordine come completato
   */
  static async complete(queueId: string, result: any) {
    await adminDb.collection(QUEUE_COLLECTION).doc(queueId).update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result,
      locked_at: null,
      locked_by: null,
    });
  }

  /**
   * Marca ordine come fallito
   */
  static async fail(queueId: string, error: any) {
    await adminDb.collection(QUEUE_COLLECTION).doc(queueId).update({
      status: "failed",
      failed_at: new Date().toISOString(),
      error: error.message,
      locked_at: null,
      locked_by: null,
    });
  }
}
