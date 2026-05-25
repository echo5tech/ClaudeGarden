import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

type PhotoRow = {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
  bed_plants: {
    plants: { common_name: string } | null;
    beds: { gardens: { name: string } | null } | null;
  } | null;
};

type BedPlantOption = {
  id: string;
  label: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Photo card ────────────────────────────────────────────────────────────────

function PhotoCard({ item, signedUrl }: { item: PhotoRow; signedUrl: string | null }) {
  const plantName = item.bed_plants?.plants?.common_name ?? 'Unknown plant';
  const gardenName = item.bed_plants?.beds?.gardens?.name ?? 'Unknown garden';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {signedUrl ? (
        <Image source={{ uri: signedUrl }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <ThemedText type="small">Loading…</ThemedText>
        </View>
      )}
      <View style={styles.cardBody}>
        <ThemedText type="smallBold" numberOfLines={1}>{plantName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{gardenName}</ThemedText>
        {item.caption ? (
          <ThemedText type="small" numberOfLines={2}>{item.caption}</ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">{formatDate(item.taken_at)}</ThemedText>
      </View>
    </ThemedView>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({
  visible,
  onClose,
  onUploaded,
}: {
  visible: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const theme = useTheme();
  const [step, setStep] = useState<'pick-source' | 'caption' | 'pick-plant' | 'uploading'>('pick-source');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [bedPlants, setBedPlants] = useState<BedPlantOption[]>([]);
  const [selectedBedPlantId, setSelectedBedPlantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('pick-source');
    setImageUri(null);
    setCaption('');
    setSelectedBedPlantId(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const pickImage = useCallback(async (fromCamera: boolean) => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    };

    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed to take photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Photo library access is needed to choose photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled || !result.assets?.[0]) return;
    setImageUri(result.assets[0].uri);
    setStep('caption');
  }, []);

  const loadBedPlants = useCallback(async () => {
    const { data } = await supabase
      .from('bed_plants')
      .select('id, plants(common_name), beds(gardens(name))')
      .limit(100);

    const opts: BedPlantOption[] = (data ?? []).map((bp) => {
      const plantName = (bp.plants as { common_name: string } | null)?.common_name ?? 'Unknown';
      const gardenName =
        (bp.beds as { gardens: { name: string } | null } | null)?.gardens?.name ?? 'Unknown';
      return { id: bp.id, label: `${plantName} · ${gardenName}` };
    });
    setBedPlants(opts);
    setStep('pick-plant');
  }, []);

  const handleUpload = useCallback(async () => {
    if (!imageUri || !selectedBedPlantId) return;
    setStep('uploading');
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Fetch the image as a blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const storagePath = `${user.id}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from('plant-photos')
        .upload(storagePath, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from('plant_photos').insert({
        user_id: user.id,
        bed_plant_id: selectedBedPlantId,
        storage_path: storagePath,
        caption: caption.trim() || null,
      });

      if (insertErr) throw insertErr;

      handleClose();
      onUploaded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      setStep('pick-plant');
    }
  }, [imageUri, selectedBedPlantId, caption, handleClose, onUploaded]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">Add Photo</ThemedText>
            <Pressable onPress={handleClose}>
              <ThemedText themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
          </View>

          {/* Step: pick source */}
          {step === 'pick-source' && (
            <View style={styles.modalBody}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.backgroundElement }]}
                onPress={() => pickImage(true)}>
                <ThemedText>Take Photo</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.backgroundElement }]}
                onPress={() => pickImage(false)}>
                <ThemedText>Choose from Library</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Step: caption */}
          {step === 'caption' && (
            <View style={styles.modalBody}>
              {imageUri && (
                <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
              )}
              <TextInput
                style={[
                  styles.captionInput,
                  { color: theme.text, borderColor: theme.backgroundElement },
                ]}
                placeholder="Add a caption (optional)"
                placeholderTextColor={theme.textSecondary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={280}
              />
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.backgroundElement }]}
                onPress={loadBedPlants}>
                <ThemedText>Next: Pick Plant</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Step: pick plant */}
          {step === 'pick-plant' && (
            <View style={styles.modalBody}>
              <ThemedText type="small" themeColor="textSecondary">
                Which plant is this photo for?
              </ThemedText>
              {error && (
                <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
              )}
              <FlatList
                data={bedPlants}
                keyExtractor={(b) => b.id}
                style={styles.plantList}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedBedPlantId(item.id)}
                    style={[
                      styles.plantOption,
                      {
                        backgroundColor:
                          selectedBedPlantId === item.id
                            ? theme.backgroundSelected
                            : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText type="small">{item.label}</ThemedText>
                  </Pressable>
                )}
              />
              <Pressable
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: selectedBedPlantId ? theme.backgroundSelected : theme.backgroundElement,
                    opacity: selectedBedPlantId ? 1 : 0.5,
                  },
                ]}
                disabled={!selectedBedPlantId}
                onPress={handleUpload}>
                <ThemedText>Upload Photo</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Step: uploading */}
          {step === 'uploading' && (
            <View style={[styles.modalBody, styles.centered]}>
              <ActivityIndicator size="large" />
              <ThemedText type="small" themeColor="textSecondary">Uploading…</ThemedText>
            </View>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const theme = useTheme();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('plant_photos')
      .select(
        'id, storage_path, caption, taken_at, bed_plants(plants(common_name), beds(gardens(name)))'
      )
      .order('taken_at', { ascending: false })
      .limit(50);

    const rows = (data ?? []) as PhotoRow[];
    setPhotos(rows);

    // Fetch signed URLs in parallel
    const urlEntries = await Promise.all(
      rows.map(async (row) => {
        const { data: sd } = await supabase.storage
          .from('plant-photos')
          .createSignedUrl(row.storage_path, 3600);
        return [row.id, sd?.signedUrl ?? null] as [string, string | null];
      })
    );
    const urlMap: Record<string, string> = {};
    for (const [id, url] of urlEntries) {
      if (url) urlMap[id] = url;
    }
    setSignedUrls(urlMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { paddingHorizontal: Spacing.four }]}>
          <ThemedText type="title">Journal</ThemedText>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
          </View>
        )}

        {!loading && photos.length === 0 && (
          <View style={[styles.centered, styles.emptyState]}>
            <ThemedText style={styles.emptyEmoji}>📷</ThemedText>
            <ThemedText type="subtitle" style={styles.emptyTitle}>No photos yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
              Start documenting your garden journey. Tap '+' to add your first photo.
            </ThemedText>
          </View>
        )}

        {!loading && photos.length > 0 && (
          <FlatList
            data={photos}
            keyExtractor={(p) => p.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: BottomTabInset + Spacing.six },
            ]}
            renderItem={({ item }) => (
              <PhotoCard item={item} signedUrl={signedUrls[item.id] ?? null} />
            )}
          />
        )}

        {/* Floating action button */}
        <Pressable
          style={[styles.fab, { backgroundColor: theme.backgroundSelected }]}
          onPress={() => setShowUpload(true)}>
          <ThemedText style={styles.fabLabel}>+</ThemedText>
        </Pressable>

        <UploadModal
          visible={showUpload}
          onClose={() => setShowUpload(false)}
          onUploaded={fetchPhotos}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyState: {
    paddingHorizontal: Spacing.six,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: Spacing.two,
    gap: 2,
  },
  fab: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.three,
    right: Spacing.four,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  fabLabel: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  modalBody: {
    gap: Spacing.two,
  },
  modalButton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: Spacing.two,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    minHeight: 64,
    fontSize: 14,
  },
  plantList: {
    maxHeight: 240,
  },
  plantOption: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  errorText: {
    color: '#c00',
  },
});
