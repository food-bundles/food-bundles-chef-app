import { FlatList, StyleSheet, View } from 'react-native';
import type { Product } from '@/mocks/types';
import { ProductCard } from '@/components/product';
import { useGuestCartStore } from '@/stores';
import { space } from '@/theme';

export interface GuestProductGridProps {
  products: Product[];
  onSelectProduct: (productId: string) => void;
}

export function GuestProductGrid({ products, onSelectProduct }: GuestProductGridProps) {
  const lines = useGuestCartStore((state) => state.lines);
  const add = useGuestCartStore((state) => state.add);
  const inc = useGuestCartStore((state) => state.inc);
  const dec = useGuestCartStore((state) => state.dec);

  return (
    <FlatList
      data={products}
      keyExtractor={(product) => product.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      renderItem={({ item }) => {
        const line = lines.find((l) => l.productId === item.id);
        return (
          <View style={styles.cell}>
            <ProductCard
              product={item}
              onPress={() => onSelectProduct(item.id)}
              onAdd={() => add(item.id)}
              qty={line?.qty ?? 0}
              onInc={() => inc(item.id)}
              onDec={() => dec(item.id)}
            />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  row: { gap: space.md },
  cell: { flex: 1 },
});
