import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Camera, Sparkles, X, Plus, ChevronRight, Utensils, AlertTriangle } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { FormScreen } from '@/components/ui/FormScreen';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppButton } from '@/components/ui/AppButton';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useKitchenStore } from '@/store/kitchen-store';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { queryKeys } from '@/api/query-keys';
import { listMenus, createMenu, createMenuItem } from '@/api/menus-api';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { agentTurn } from '@/api/agent-api';
import { detectAnomaly } from '@/domain/anomaly';
import { useColorScheme } from 'react-native';
import { colors, spacing, fontSize, radius } from '@/lib/theme';

const COMMON_ITEMS = [
  'Brochettes', 'Ugali', 'Chips', 'Rice', 'Beans', 'Chicken Stew', 'Fish Fry',
  'Beef Stew', 'Chapati', 'Mandazi', 'Samosa', 'Pilau', 'Matoke', 'Nyama Choma',
  'Orange Juice', 'Passion Juice', 'Avocado Juice', 'Mango Juice', 'Soda', 'Water',
  'Milk Tea', 'Black Tea', 'Coffee', 'Hot Chocolate',
];

export interface AiIngredientSuggestion {
  name: string;
  qty: string;
  unit: string;
}

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80).trim(),
  selling_price: z
    .string()
    .min(1, 'Price is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Enter a valid price'),
  description: z.string().max(200).trim().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function CreateMenuItemScreen() {
  const isDark = useColorScheme() === 'dark';

  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  // Photo + AI state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiIngredients, setAiIngredients] = useState<AiIngredientSuggestion[]>([]);
  const [aiSuggestedPrice, setAiSuggestedPrice] = useState<string | null>(null);
  const [aiDismissed, setAiDismissed] = useState(false);

  const { data: existingItems = [] } = useMenuItems();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', selling_price: '', description: '' },
  });

  const nameValue = watch('name');

  const suggestions = useMemo(() => {
    const q = nameValue.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    const existingNames = existingItems.map((i) => i.name);
    const allOptions = [...new Set([...existingNames, ...COMMON_ITEMS])];
    return allOptions
      .filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q)
      .slice(0, 5);
  }, [nameValue, existingItems]);

  const showSuggestions = nameFocused && suggestions.length > 0;

  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to continue.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setAiIngredients([]);
      setAiSuggestedPrice(null);
      setAiDismissed(false);
    }
  };

  const showPhotoPicker = () =>
    Alert.alert('Add Photo', 'Take a photo of the dish or select from gallery', [
      { text: 'Camera', onPress: () => pickPhoto(true) },
      { text: 'Gallery', onPress: () => pickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const analyzePhoto = async () => {
    if (!photoUri || !activeKitchen) return;
    setAnalyzing(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const itemName = nameValue.trim() || 'this dish';
      const prompt = `You are a professional kitchen assistant. I'm looking at a photo of "${itemName}".
Please analyze this dish and provide:
1. A list of main ingredients (up to 8), with estimated quantity per portion and unit
2. A suggested selling price in RWF (Rwandan Francs) based on typical Kigali restaurant pricing

Respond ONLY in this exact JSON format, nothing else:
{
  "ingredients": [
    {"name": "ingredient name", "qty": "0.000", "unit": "kg|g|litres|ml|pieces"},
    ...
  ],
  "suggested_price": "3500"
}`;

      const response = await agentTurn(activeKitchen.id, {
        messages: [
          {
            role: 'chef',
            content: prompt,
            image_data: base64,
          },
        ],
      });

      const text = response.reply_text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          ingredients: AiIngredientSuggestion[];
          suggested_price: string;
        };
        if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) {
          setAiIngredients(parsed.ingredients);
        }
        if (parsed.suggested_price) {
          setAiSuggestedPrice(parsed.suggested_price);
          if (!watch('selling_price')) {
            setValue('selling_price', parsed.suggested_price, { shouldValidate: true });
          }
        }
      } else {
        Alert.alert('AI Analysis', 'Could not parse AI response. Please enter details manually.');
      }
    } catch {
      Alert.alert('AI Analysis', 'AI analysis failed. You can enter ingredients manually after saving.');
    } finally {
      setAnalyzing(false);
    }
  };

  const removeAiIngredient = (index: number) => {
    setAiIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (!activeKitchen) return;
    setSaving(true);
    setError(null);
    try {
      const menus = await listMenus(activeKitchen.id);
      let menuId = menus.find((m) => m.is_active)?.id;
      if (!menuId) {
        const created = await createMenu(activeKitchen.id, { name: 'Main Menu' });
        menuId = created.id;
      }

      await createMenuItem(activeKitchen.id, menuId, {
        name: values.name,
        selling_price: values.selling_price,
        description: values.description || null,
      });

      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, activeKitchen.id) });
      router.back();
    } catch {
      setError('Could not save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? colors.surface[700] : colors.surface[200];
  const bg = isDark ? colors.surface[950] : colors.surface[50];

  const hasAiResults = aiIngredients.length > 0 || aiSuggestedPrice != null;

  const sellingPriceValue = watch('selling_price');
  const priceAnomalyWarning = useMemo((): 'high' | 'low' | false => {
    const entered = parseFloat(sellingPriceValue);
    if (isNaN(entered) || entered <= 0) return false;
    const peers = existingItems
      .map((i) => parseFloat(i.selling_price))
      .filter((p) => !isNaN(p) && p > 0);
    return detectAnomaly(entered, peers);
  }, [sellingPriceValue, existingItems]);

  return (
    <AppScreen>
      <AppHeader title="New Menu Item" showBack />
      <FormScreen>
        <ScrollView
          style={{ backgroundColor: bg }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo + AI section */}
          <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor }}>
            {photoUri ? (
              <View>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: 180 }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => { setPhotoUri(null); setAiIngredients([]); setAiSuggestedPrice(null); }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: 14,
                    width: 28,
                    height: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={14} color={colors.white} strokeWidth={2.5} />
                </Pressable>

                {/* Analyze button */}
                {!hasAiResults && !analyzing && (
                  <View style={{ padding: spacing.md, paddingTop: 0, marginTop: spacing.sm }}>
                    <Pressable
                      onPress={analyzePhoto}
                      accessibilityRole="button"
                      accessibilityLabel="Analyze photo with AI"
                      style={({ pressed }) => ({
                        backgroundColor: colors.brand[500],
                        borderRadius: radius.lg,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        margin: spacing.md,
                        marginTop: spacing.sm,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Sparkles size={16} color={colors.white} strokeWidth={2} />
                      <Text style={{ color: colors.white, fontWeight: '700', fontSize: fontSize.sm }}>
                        Analyze with AI
                      </Text>
                    </Pressable>
                  </View>
                )}

                {analyzing && (
                  <View style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <ActivityIndicator color={colors.brand[500]} size="small" />
                    <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>Analyzing dish…</Text>
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                onPress={showPhotoPicker}
                accessibilityRole="button"
                accessibilityLabel="Add dish photo for AI analysis"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  gap: spacing.md,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.md,
                  backgroundColor: colors.brand[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: colors.brand[100],
                  borderStyle: 'dashed',
                }}>
                  <Camera size={22} color={colors.brand[500]} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: textPrimary, fontWeight: '600', fontSize: fontSize.sm }}>Add Dish Photo</Text>
                    <View style={{ backgroundColor: colors.brand[50], borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ color: colors.brand[500], fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>AI</Text>
                    </View>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                    AI will suggest ingredients and a price
                  </Text>
                </View>
                <ChevronRight size={16} color={textSecondary} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {/* AI Results */}
          {hasAiResults && !aiDismissed && (
            <View style={{ backgroundColor: colors.brand[50], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.brand[100], overflow: 'hidden' }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
                paddingBottom: spacing.sm,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} color={colors.brand[500]} strokeWidth={2} />
                  <Text style={{ color: colors.brand[500], fontWeight: '700', fontSize: fontSize.sm }}>AI Suggestions</Text>
                </View>
                <Pressable onPress={() => setAiDismissed(true)} hitSlop={8}>
                  <X size={16} color={textSecondary} strokeWidth={2} />
                </Pressable>
              </View>

              {aiSuggestedPrice && (
                <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>Suggested price:</Text>
                  <Pressable
                    onPress={() => setValue('selling_price', aiSuggestedPrice, { shouldValidate: true })}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      backgroundColor: colors.brand[500],
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ color: colors.white, fontSize: fontSize.xs, fontWeight: '700' }}>
                      {parseFloat(aiSuggestedPrice).toLocaleString()} RWF
                    </Text>
                  </Pressable>
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>(tap to use)</Text>
                </View>
              )}

              {aiIngredients.length > 0 && (
                <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 6 }}>
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                    Detected Ingredients
                  </Text>
                  {aiIngredients.map((ing, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: cardBg,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.sm + 4,
                        paddingVertical: spacing.sm,
                        gap: 8,
                      }}
                    >
                      <Utensils size={14} color={colors.brand[500]} strokeWidth={2} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '500' }}>{ing.name}</Text>
                        <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>{ing.qty} {ing.unit} per portion</Text>
                      </View>
                      <Pressable
                        onPress={() => removeAiIngredient(i)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${ing.name}`}
                        hitSlop={8}
                        style={{ padding: 2 }}
                      >
                        <X size={14} color={textSecondary} strokeWidth={2} />
                      </Pressable>
                    </View>
                  ))}
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 4, textAlign: 'center' }}>
                    These will be linked to the item after saving from the detail screen.
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>
            Add a dish or drink to your menu. Activate or deactivate items from the Menu tab.
          </Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <AppTextField
                  label="Item Name"
                  placeholder="e.g. Brochettes, Ugali, Orange Juice"
                  value={value}
                  onChangeText={onChange}
                  onBlur={() => {
                    onBlur();
                    setTimeout(() => setNameFocused(false), 150);
                  }}
                  error={errors.name?.message}
                  autoFocus
                  autoCapitalize="words"
                  inputProps={{ onFocus: () => setNameFocused(true) }}
                />
                {showSuggestions && (
                  <View
                    style={{
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderColor,
                      borderRadius: radius.md,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                  >
                    {suggestions.map((s, i) => (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setValue('name', s, { shouldValidate: true });
                          setNameFocused(false);
                        }}
                        style={({ pressed }) => ({
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm + 2,
                          backgroundColor: pressed ? (isDark ? colors.surface[700] : colors.surface[100]) : 'transparent',
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: borderColor,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.sm,
                        })}
                      >
                        <Text style={{ color: colors.brand[500], fontSize: fontSize.sm }}>+</Text>
                        <Text style={{ color: textPrimary, fontSize: fontSize.sm, flex: 1 }}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          />

          {/* Category */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: isDark ? colors.surface[400] : colors.surface[600], fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['Main', 'Side', 'Drink', 'Dessert'] as const).map((cat) => (
                <SelectableChip
                  key={cat}
                  label={cat}
                  selected={category === cat}
                  onPress={() => setCategory(category === cat ? null : cat)}
                />
              ))}
            </View>
          </View>

          <Controller
            control={control}
            name="selling_price"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Selling Price (RWF)"
                placeholder="e.g. 3500"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.selling_price?.message}
                keyboardType="decimal-pad"
              />
            )}
          />

          {priceAnomalyWarning !== false && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '1A', borderRadius: radius.md, padding: spacing.sm + 2, borderWidth: 1, borderColor: colors.warning + '4D' }}>
              <AlertTriangle size={14} color={colors.warning} strokeWidth={2} />
              <Text style={{ color: colors.warning, fontSize: fontSize.xs, flex: 1, lineHeight: 18 }}>
                {priceAnomalyWarning === 'high'
                  ? 'This price is unusually high compared to your other items — please confirm it\'s correct.'
                  : 'This price is unusually low compared to your other items — please confirm it\'s correct.'}
              </Text>
            </View>
          )}

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Description (optional)"
                placeholder="e.g. Grilled beef skewers with peppers"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
                multiline
                numberOfLines={2}
              />
            )}
          />

          {aiIngredients.length > 0 && (
            <View style={{ backgroundColor: colors.brand[50], borderRadius: radius.md, padding: spacing.sm + 2, flexDirection: 'row', gap: 8 }}>
              <View style={{ marginTop: 2 }}><Sparkles size={14} color={colors.brand[500]} strokeWidth={2} /></View>
              <Text style={{ color: colors.brand[500], fontSize: fontSize.xs, flex: 1, lineHeight: 18 }}>
                After saving, open the item detail to link the AI-suggested ingredients to the recipe.
              </Text>
            </View>
          )}

          {error && (
            <Text style={{ color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' }}>
              {error}
            </Text>
          )}
        </ScrollView>

        <StickyFooter>
          <AppButton
            label="Save Menu Item"
            onPress={handleSubmit(onSubmit)}
            loading={saving}
            size="lg"
          />
        </StickyFooter>
      </FormScreen>
    </AppScreen>
  );
}

