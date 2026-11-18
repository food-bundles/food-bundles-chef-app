import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Share,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MapPin,
  Navigation,
  Share2,
  X,
  Clock,
  Route,
} from 'lucide-react-native';
import { AppHeader } from '@/components/ui/AppScreen';
import { colors, spacing, fontSize, fontWeight, radius } from '@/lib/theme';

interface Coord {
  latitude: number;
  longitude: number;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function calcDistance(coords: Coord[]) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const R = 6371000;
    const dLat = (((curr!).latitude - (prev!).latitude) * Math.PI) / 180;
    const dLon = (((curr!).longitude - (prev!).longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(((prev!).latitude * Math.PI) / 180) *
        Math.cos(((curr!).latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}

export default function DeliveryMapScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const params = useLocalSearchParams<{ supplierName?: string; deliveryId?: string }>();
  const supplierName = params.supplierName ?? t('receiving.deliveryDefaultName');

  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  // Set when tracking starts (reading the clock during render is impure).
  const startTimeRef = useRef(0);

  const [permissionStatus, setPermissionStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [currentLocation, setCurrentLocation] = useState<Coord | null>(null);
  const [route, setRoute] = useState<Coord[]>([]);
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pinLocation, setPinLocation] = useState<Coord | null>(null);

  // Timer
  useEffect(() => {
    if (!tracking) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [tracking]);

  // Request permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionStatus('denied');
        return;
      }
      setPermissionStatus('granted');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrentLocation(coord);
      setRoute([coord]);
      mapRef.current?.animateToRegion({
        ...coord,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
    return () => { watchRef.current?.remove(); };
  }, []);

  const startTracking = useCallback(async () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    setTracking(true);

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (loc) => {
        const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentLocation(coord);
        setRoute((prev) => [...prev, coord]);
        mapRef.current?.animateToRegion({
          ...coord,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      },
    );
  }, []);

  const stopTracking = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    setTracking(false);
  }, []);

  const handleCenterOnMe = () => {
    if (!currentLocation) return;
    mapRef.current?.animateToRegion({
      ...currentLocation,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    });
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: Coord } }) => {
    if (tracking) return;
    setPinLocation(e.nativeEvent.coordinate);
  };

  const handleShareLocation = async () => {
    if (!currentLocation) return;
    const { latitude, longitude } = currentLocation;
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    try {
      await Share.share({
        message: t('receiving.map.shareMessage', { supplier: supplierName, url }),
        url,
      });
    } catch {
      // user cancelled
    }
  };

  const handleDone = () => {
    stopTracking();
    router.back();
  };

  const distance = calcDistance(route);

  if (permissionStatus === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: tk.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand[500]} />
        <Text style={{ color: tk.textMuted, marginTop: spacing.sm, fontSize: fontSize.sm }}>{t('receiving.gettingLocation')}</Text>
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={{ flex: 1, backgroundColor: tk.surfaceSunken }}>
        <AppHeader title={t('receiving.mapTitle')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <MapPin size={48} color={tk.textMuted} strokeWidth={1.5} />
          <Text style={{ color: tk.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md, textAlign: 'center' }}>
            {t('receiving.locationRequired')}
          </Text>
          <Text style={{ color: tk.textMuted, fontSize: fontSize.base, textAlign: 'center', marginTop: spacing.sm }}>
            {t('receiving.locationRequiredDesc')}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg, backgroundColor: tk.surfaceRaised, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}
          >
            <Text style={{ color: tk.text }}>{t('receiving.goBack')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={tracking}
        onPress={handleMapPress}
        initialRegion={
          currentLocation
            ? { ...currentLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : { latitude: -1.9441, longitude: 30.0619, latitudeDelta: 0.1, longitudeDelta: 0.1 }
        }
      >
        {/* Route polyline */}
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={colors.brand[500]}
            strokeWidth={4}
            lineDashPattern={tracking ? undefined : [8, 4]}
          />
        )}

        {/* Start marker */}
        {route.length > 0 && route[0] && (
          <Marker
            coordinate={route[0]}
            title={t('receiving.map.start')}
            pinColor={colors.success}
          />
        )}

        {/* Manual pin */}
        {pinLocation && (
          <Marker
            coordinate={pinLocation}
            title={supplierName}
            description={t('receiving.map.tapToRemove')}
            pinColor={colors.brand[500]}
            onCalloutPress={() => setPinLocation(null)}
          />
        )}
      </MapView>

      {/* Top bar */}
      <View style={{ position: 'absolute', top: Platform.OS === 'android' ? 40 : 54, left: spacing.md, right: spacing.md }}>
        <View style={{ backgroundColor: 'rgba(15,20,27,0.92)', borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <MapPin size={16} color={colors.brand[400]} />
          <Text style={{ color: colors.white, fontWeight: fontWeight.semibold, flex: 1 }} numberOfLines={1}>
            {supplierName}
          </Text>
          <Pressable onPress={handleDone} hitSlop={8}>
            <X size={20} color={colors.surface[400]} />
          </Pressable>
        </View>
      </View>

      {/* Stats bar */}
      {tracking && (
        <View style={{ position: 'absolute', top: Platform.OS === 'android' ? 100 : 114, left: spacing.md, right: spacing.md }}>
          <View style={{ backgroundColor: 'rgba(15,20,27,0.88)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Clock size={12} color={colors.surface[500]} />
              <Text style={{ color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginTop: 2 }}>
                {formatDuration(elapsed)}
              </Text>
              <Text style={{ color: colors.surface[500], fontSize: 10 }}>{t('receiving.timeLabel')}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.surface[700] }} />
            <View style={{ alignItems: 'center' }}>
              <Route size={12} color={colors.surface[500]} />
              <Text style={{ color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginTop: 2 }}>
                {formatDistance(distance)}
              </Text>
              <Text style={{ color: colors.surface[500], fontSize: 10 }}>{t('receiving.distanceLabel')}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.surface[700] }} />
            <View style={{ alignItems: 'center' }}>
              <MapPin size={12} color={colors.surface[500]} />
              <Text style={{ color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginTop: 2 }}>
                {route.length}
              </Text>
              <Text style={{ color: colors.surface[500], fontSize: 10 }}>{t('receiving.pointsLabel')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Right side controls */}
      <View style={{ position: 'absolute', right: spacing.md, bottom: 180, gap: spacing.sm }}>
        <Pressable
          onPress={handleCenterOnMe}
          style={{ backgroundColor: 'rgba(15,20,27,0.92)', borderRadius: 28, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={t('receiving.centerOnMe')}
        >
          <Navigation size={20} color={colors.white} />
        </Pressable>
        <Pressable
          onPress={handleShareLocation}
          style={{ backgroundColor: 'rgba(15,20,27,0.92)', borderRadius: 28, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={t('receiving.shareLocation')}
        >
          <Share2 size={20} color={colors.white} />
        </Pressable>
      </View>

      {/* Bottom action bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing.md }}>
        <View style={{ backgroundColor: 'rgba(15,20,27,0.95)', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }}>
          {!tracking ? (
            <>
              <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, textAlign: 'center' }}>
                {route.length <= 1 ? t('receiving.tapMapHint') : t('receiving.routeRecorded')}
              </Text>
              <Pressable
                onPress={startTracking}
                style={{ backgroundColor: colors.brand[500], borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}
                accessibilityLabel={t('receiving.startTrackingRoute')}
              >
                <Route size={18} color={colors.white} />
                <Text style={{ color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
                  {t('receiving.startTrackingRoute')}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, textAlign: 'center' }}>
                {t('receiving.trackingActive')}
              </Text>
              <Pressable
                onPress={stopTracking}
                style={{ backgroundColor: colors.danger, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}
                accessibilityLabel={t('receiving.stopTracking')}
              >
                <X size={18} color={colors.white} />
                <Text style={{ color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
                  {t('receiving.stopTracking')}
                </Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={handleDone}
            style={{ borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}
          >
            <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>{t('receiving.doneBack')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
