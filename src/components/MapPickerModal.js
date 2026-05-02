/**
 * src/components/MapPickerModal.js
 *
 * Reusable full-screen map picker with:
 *   • Floating search bar (debounced, 400 ms)
 *   • Animated results dropdown
 *   • Tap-on-map fallback (reverse geocode via mapSearch)
 *   • Camera animation to selected location
 *   • Confirm button returns { name, coordinates: { lat, lng } }
 *
 * Props
 * ─────
 *   visible           boolean                           required
 *   onClose           () => void                        required
 *   onConfirm         (location) => void                required
 *   title             string                            default 'Select Location'
 *   initialCoordinate [longitude, latitude]             required
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { Access_Token_MapBox } from '../utils/Creds';
import { searchLocation, reverseGeocode } from '../utils/mapSearch';

MapboxGL.setAccessToken(Access_Token_MapBox);

const DEBOUNCE_MS = 400;
const MAX_RESULTS = 5;

const MapPickerModal = ({
  visible,
  onClose,
  onConfirm,
  title = 'Select Location',
  initialCoordinate,
}) => {
  const [selectedCoords, setSelectedCoords]   = useState(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [searchQuery, setSearchQuery]         = useState('');
  const [searchResults, setSearchResults]     = useState([]);
  const [isSearching, setIsSearching]         = useState(false);

  const cameraRef  = useRef(null);
  const debounceRef = useRef(null);

  // Reset all state whenever the modal closes so next open is fresh
  useEffect(() => {
    if (!visible) {
      clearTimeout(debounceRef.current);
      setSelectedCoords(null);
      setSelectedAddress('');
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [visible]);

  // ── Search bar ──────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback(text => {
    setSearchQuery(text);
    clearTimeout(debounceRef.current);

    if (text.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLocation(text);
        setSearchResults(results.slice(0, MAX_RESULTS));
      } catch (err) {
        console.warn('[MapPickerModal] Search error:', err.message);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clearSearch = useCallback(() => {
    clearTimeout(debounceRef.current);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // ── Result selection ────────────────────────────────────────────────────────

  const handleSelectResult = useCallback(result => {
    Keyboard.dismiss();
    const coords = [result.longitude, result.latitude];
    setSelectedCoords(coords);
    setSelectedAddress(result.address);
    clearSearch();

    cameraRef.current?.setCamera({
      centerCoordinate: coords,
      zoomLevel: 14,
      animationDuration: 800,
    });
  }, [clearSearch]);

  // ── Map tap (fallback) ──────────────────────────────────────────────────────

  const handleMapTap = useCallback(async feature => {
    const [lng, lat] = feature.geometry.coordinates;
    setSelectedCoords([lng, lat]);
    clearSearch();

    const { address } = await reverseGeocode(lat, lng);
    setSelectedAddress(address);
  }, [clearSearch]);

  // ── Confirm ─────────────────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!selectedCoords || !selectedAddress) return;
    onConfirm({
      name: selectedAddress,
      coordinates: { lat: selectedCoords[1], lng: selectedCoords[0] },
    });
  }, [selectedCoords, selectedAddress, onConfirm]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const showDropdown = isSearching || searchResults.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleClose}>
            <MaterialDesignIcons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Map + floating search overlay ── */}
        <View style={styles.mapWrapper}>
          <MapboxGL.MapView
            style={styles.map}
            onPress={handleMapTap}
            logoEnabled={false}
            scaleBarEnabled={false}
            styleURL={MapboxGL.StyleURL.Dark}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={12}
              centerCoordinate={initialCoordinate}
            />
            {selectedCoords && (
              <MapboxGL.PointAnnotation
                id="mapPickerPin"
                coordinate={selectedCoords}
              >
                <View style={styles.markerOuter}>
                  <View style={styles.markerInner}>
                    <MaterialDesignIcons
                      name="map-marker"
                      size={22}
                      color={COLORS.white}
                    />
                  </View>
                </View>
              </MapboxGL.PointAnnotation>
            )}
          </MapboxGL.MapView>

          {/* Floating search bar + dropdown */}
          <View style={styles.searchOverlay} pointerEvents="box-none">
            <View style={styles.searchBar}>
              <MaterialDesignIcons
                name="magnify"
                size={20}
                color={COLORS.textMuted}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search address or place…"
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialDesignIcons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {showDropdown && (
              <View style={styles.dropdown}>
                {isSearching ? (
                  <View style={styles.dropdownRow}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                    <Text style={styles.dropdownMeta}>Searching…</Text>
                  </View>
                ) : searchResults.length === 0 ? (
                  <View style={styles.dropdownRow}>
                    <MaterialDesignIcons
                      name="map-search-outline"
                      size={18}
                      color={COLORS.textMuted}
                    />
                    <Text style={styles.dropdownMeta}>No results found</Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(_, i) => String(i)}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={searchResults.length > 3}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity
                        style={[
                          styles.resultItem,
                          index < searchResults.length - 1 && styles.resultItemBorder,
                        ]}
                        onPress={() => handleSelectResult(item)}
                        activeOpacity={0.7}
                      >
                        <MaterialDesignIcons
                          name="map-marker-outline"
                          size={18}
                          color={COLORS.accent}
                          style={styles.resultIcon}
                        />
                        <View style={styles.resultText}>
                          <Text style={styles.resultName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.resultAddress} numberOfLines={1}>
                            {item.address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          {selectedAddress ? (
            <View style={styles.selectedAddressRow}>
              <MaterialDesignIcons name="map-marker" size={20} color={COLORS.accent} />
              <Text style={styles.selectedAddressText} numberOfLines={2}>
                {selectedAddress}
              </Text>
            </View>
          ) : (
            <Text style={styles.tapHint}>
              Search above or tap the map to pick a location
            </Text>
          )}
          <TouchableOpacity
            style={[styles.confirmBtn, !selectedCoords && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedCoords}
          >
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    padding: SIZES.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTSIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },

  // Map
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // Marker
  markerOuter: {
    alignItems: 'center',
  },
  markerInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
  },

  // Search overlay (floats above map)
  searchOverlay: {
    position: 'absolute',
    top: SIZES.md,
    left: SIZES.md,
    right: SIZES.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
    ...SHADOWS.medium,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTSIZES.md,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // Results dropdown
  dropdown: {
    marginTop: SIZES.xs,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    maxHeight: 220,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
  },
  dropdownMeta: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
  },
  resultItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultIcon: {
    marginRight: SIZES.sm,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: FONTSIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: FONTSIZES.xs,
    color: COLORS.textSecondary,
  },

  // Footer
  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  selectedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '12',
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: FONTSIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  tapHint: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.7,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontSize: FONTSIZES.md,
    fontWeight: '600',
  },
});

export default MapPickerModal;
