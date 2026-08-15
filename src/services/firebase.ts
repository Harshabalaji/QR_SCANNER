// Mock Firebase setup
// In a real app, you would define your initialized Firebase app instance here
// using `firebase/app` and `firebase/firestore`.

import { Product } from '../store/useStore';

export const mockFirebase = {
  syncLocalToCloud: async (inventory: Product[]) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`[Firebase] Successfully synced ${inventory.length} items to cloud.`);
    return true;
  },
  fetchCloudInventory: async (): Promise<Product[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('[Firebase] Fetched cloud inventory.');
    return [];
  }
};
