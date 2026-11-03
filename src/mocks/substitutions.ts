export interface Substitution {
  fromProductId: string;
  toProductId: string;
  note: string;
}

/** Cheaper-alternative pairs surfaced on the Purchase Advisor when the original item is expensive. */
export const substitutions: Substitution[] = [
  {
    fromProductId: 'fresh-tomatoes',
    toProductId: 'red-onions',
    note: 'Red onions add similar depth to sauces at a lower cost per kg.',
  },
  {
    fromProductId: 'avocados',
    toProductId: 'green-beans',
    note: 'Green beans offer a lighter, cheaper side when avocado prices spike.',
  },
  {
    fromProductId: 'rice',
    toProductId: 'irish-potatoes',
    note: 'Irish potatoes make a filling, cheaper base for the same dishes.',
  },
];
