export interface DirectoryRestaurant {
  id: string;
  name: string;
  neighborhood: string;
  /** Links this restaurant to a peer-chat conversation; absent until a conversation has started. */
  conversationId?: string;
}

export const RESTAURANT_DIRECTORY: DirectoryRestaurant[] = [
  { id: 'r-imboni', name: 'Imboni', neighborhood: 'Kacyiru', conversationId: 'conv-peer-imboni' },
  { id: 'r-laza', name: 'Laza', neighborhood: 'Kiyovu' },
  { id: 'r-mrchips', name: "Mr Chip's", neighborhood: 'Remera' },
  { id: 'r-tugende', name: 'Tugende Hostel', neighborhood: 'Nyamirambo' },
  { id: 'r-foodandstuff', name: 'Food & Stuff', neighborhood: 'Kimihurura' },
  { id: 'r-soleluna', name: 'Sole Luna', neighborhood: 'Kiyovu' },
];
