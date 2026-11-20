import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Camera, RefreshCw, Check, AlertTriangle, Download, Database } from 'lucide-react-native';
import { CubeColor } from '../types/puzzle';
import { PALETTE } from '../components/3d/stickerLayout';
import {
  CUBE_COLORS,
  RGBColor,
  StickerDetectionResult,
  jointCubeAssignment,
} from './colorClassifier';
import {
  computeVideoCropBox,
  sampleGridFromImageData,
  CropBox,
} from './imageSampler';

interface CameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  dimension: 2 | 3 | 4;
  onScanComplete: (scannedFaces: Record<string, CubeColor[]>) => void;
}

const FACE_ORDER: Array<{
  face: string;
  name: string;
  centerColorName: string;
  color: string;
  tiltInstruction: string;
}> = [
  { face: 'U', name: 'White (Top)', centerColorName: 'White', color: '#F8FAFC', tiltInstruction: 'Hold with White on top and Green facing you.' },
  { face: 'F', name: 'Green (Front)', centerColorName: 'Green', color: '#10B981', tiltInstruction: 'Tilt forward: Green faces you directly.' },
  { face: 'R', name: 'Red (Right)', centerColorName: 'Red', color: '#EF4444', tiltInstruction: 'Turn left: Red faces you (White stays on top).' },
  { face: 'B', name: 'Blue (Back)', centerColorName: 'Blue', color: '#3B82F6', tiltInstruction: 'Turn left: Blue faces you (White stays on top).' },
  { face: 'L', name: 'Orange (Left)', centerColorName: 'Orange', color: '#F97316', tiltInstruction: 'Turn left: Orange faces you (White stays on top).' },
  { face: 'D', name: 'Yellow (Bottom)', centerColorName: 'Yellow', color: '#EAB308', tiltInstruction: 'Tilt up: Yellow faces you.' },
];

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  visible,
  onClose,
  dimension,
  onScanComplete,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [scannedFaceDetections, setScannedFaceDetections] = useState<Record<string, StickerDetectionResult[]>>({});
  const [currentFaceStickers, setCurrentFaceStickers] = useState<Array<CubeColor | 'unknown'> | null>(null);
  const [currentFaceDetections, setCurrentFaceDetections] = useState<StickerDetectionResult[] | null>(null);
  const [selectedCellIdx, setSelectedCellIdx] = useState<number>(0);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [lastDebugInfo, setLastDebugInfo] = useState<any>(null);

  // Live feedback
  const [liveDetections, setLiveDetections] = useState<StickerDetectionResult[] | null>(null);
  const [ambientWhitePoint, setAmbientWhitePoint] = useState<RGBColor | undefined>(undefined);

  // Preview container layout measurements
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number }>({ width: 360, height: 600 });
  const [isReviewing, setIsReviewing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jointIssue, setJointIssue] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);
  const currentFace = FACE_ORDER[currentFaceIndex] || FACE_ORDER[0];

  // Reset state on modal open
  useEffect(() => {
    if (visible) {
      setCurrentFaceIndex(0);
      setScannedFaceDetections({});
      setCurrentFaceStickers(null);
      setCurrentFaceDetections(null);
      setCapturedPhotoUri(null);
      setIsReviewing(false);
      setLiveDetections(null);
      setAmbientWhitePoint(undefined);
      setJointIssue(null);
    }
  }, [visible]);

  // Dimensions math
  const containerW = containerLayout.width || 360;
  const containerH = containerLayout.height || 600;
  const gridBoxSize = Math.round(Math.min(containerW * 0.85, containerH * 0.85));
  const cellSize = gridBoxSize / dimension;

  // Live preview loop (~300ms)
  useEffect(() => {
    if (!visible || isReviewing || Platform.OS !== 'web') return;

    let isSubscribed = true;
    const interval = setInterval(() => {
      if (!isSubscribed || isReviewing) return;

      try {
        const video = document.querySelector('video') as HTMLVideoElement | null;
        if (!video || video.videoWidth <= 0 || video.videoHeight <= 0 || video.readyState < 2) {
          return;
        }

        const cropBox = computeVideoCropBox(video.videoWidth, video.videoHeight, containerW, containerH, 0.85);

        // Offscreen sampling canvas
        const offCanvas = document.createElement('canvas');
        offCanvas.width = video.videoWidth;
        offCanvas.height = video.videoHeight;
        const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const imgData = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);

        const results = sampleGridFromImageData(imgData, cropBox, dimension, ambientWhitePoint);
        if (isSubscribed) {
          setLiveDetections(results);
        }
      } catch {
        // ignore transient live capture frames
      }
    }, 300);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [visible, isReviewing, containerW, containerH, dimension, ambientWhitePoint]);

  // Snap photo & perform full-resolution crop classification
  const handleSnap = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let photoUri: string | null = null;
      let detections: StickerDetectionResult[] = [];
      let cropInfo: CropBox = { cropX: 0, cropY: 0, cropSize: 300 };
      let videoRes = { width: 0, height: 0 };

      if (Platform.OS === 'web') {
        const video = document.querySelector('video') as HTMLVideoElement | null;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          videoRes = { width: video.videoWidth, height: video.videoHeight };
          cropInfo = computeVideoCropBox(video.videoWidth, video.videoHeight, containerW, containerH, 0.85);

          // 1. Draw full video frame to memory
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = video.videoWidth;
          fullCanvas.height = video.videoHeight;
          const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
          if (fullCtx) {
            fullCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const fullImgData = fullCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);

            // Sample stickers using crop coordinates
            detections = sampleGridFromImageData(fullImgData, cropInfo, dimension, ambientWhitePoint);

            // 2. Extract cropped square image for confirm dialog preview & debug saving
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = 360;
            cropCanvas.height = 360;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              cropCtx.drawImage(
                video,
                cropInfo.cropX,
                cropInfo.cropY,
                cropInfo.cropSize,
                cropInfo.cropSize,
                0,
                0,
                360,
                360
              );
              photoUri = cropCanvas.toDataURL('image/png');
            }
          }
        }
      } else if (cameraRef.current) {
        // Native camera snapshot
        const pic = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });
        if (pic?.uri) {
          photoUri = pic.uri;
          // In native, if dimensions are known, sample using dimensions
          cropInfo = computeVideoCropBox(pic.width || 1080, pic.height || 1920, containerW, containerH, 0.85);
          // Fallback to live detections if already sampled
          detections = liveDetections || [];
        }
      }

      // If Face 1 (White): calibrate ambient white point from White center (index 4 for 3x3)
      if (currentFace.face === 'U' && detections.length > 4 && dimension === 3) {
        const centerPatch = detections[4];
        if (centerPatch.rawRgb && centerPatch.rawRgb.r > 80) {
          setAmbientWhitePoint(centerPatch.rawRgb);
        }
      }

      // If detection yielded empty array (fallback safety), mark unknown (Rule 2h)
      if (detections.length === 0) {
        detections = Array.from({ length: dimension * dimension }, () => ({
          color: 'unknown',
          confidence: 0,
          isAmbiguous: true,
          rawRgb: { r: 128, g: 128, b: 128 },
          lab: { L: 50, a: 0, b: 0 },
          distances: { white: 100, yellow: 100, green: 100, blue: 100, red: 100, orange: 100 },
        }));
      }

      // Save debug payload for Step 1
      setLastDebugInfo({
        face: currentFace.face,
        faceName: currentFace.name,
        timestamp: Date.now(),
        videoResolution: videoRes,
        cropRect: cropInfo,
        whitePoint: ambientWhitePoint,
        cells: detections.map((d, i) => ({
          index: i,
          row: Math.floor(i / dimension),
          col: i % dimension,
          medianRgb: d.rawRgb,
          lab: d.lab,
          assignedColor: d.color,
          distances: d.distances,
          confidence: d.confidence,
          isAmbiguous: d.isAmbiguous,
        })),
      });

      setCapturedPhotoUri(photoUri);
      setCurrentFaceDetections(detections);
      setCurrentFaceStickers(detections.map((d) => d.color));
      setSelectedCellIdx(0);
      setIsReviewing(true);
    } catch (e) {
      console.error('Snap error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // User manual correction in review dialog
  const handleSelectColorForCell = (color: CubeColor) => {
    if (!currentFaceStickers || !currentFaceDetections) return;

    const updatedStickers = [...currentFaceStickers];
    updatedStickers[selectedCellIdx] = color;
    setCurrentFaceStickers(updatedStickers);

    // Update detection record to mark confirmed
    const updatedDetections = [...currentFaceDetections];
    updatedDetections[selectedCellIdx] = {
      ...updatedDetections[selectedCellIdx],
      color,
      confidence: 1.0,
      isAmbiguous: false,
    };
    setCurrentFaceDetections(updatedDetections);
  };

  // Step 1: Dev-only "Save debug capture"
  const handleSaveDebugCapture = useCallback(() => {
    if (!lastDebugInfo || Platform.OS !== 'web' || typeof document === 'undefined') return;

    const jsonStr = JSON.stringify(lastDebugInfo, null, 2);
    const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `debug_${currentFace.face}_${Date.now()}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);

    if (capturedPhotoUri) {
      const imgLink = document.createElement('a');
      imgLink.href = capturedPhotoUri;
      imgLink.download = `debug_${currentFace.face}_${Date.now()}.png`;
      document.body.appendChild(imgLink);
      imgLink.click();
      document.body.removeChild(imgLink);
    }
  }, [lastDebugInfo, currentFace.face, capturedPhotoUri]);

  // Step 3: Dev-only "Save as fixture"
  const handleSaveAsFixture = useCallback(() => {
    if (!currentFaceStickers || Platform.OS !== 'web' || typeof document === 'undefined') return;

    const fixtureData = {
      face: currentFace.face,
      dimension,
      timestamp: Date.now(),
      labels: currentFaceStickers,
    };

    const jsonBlob = new Blob([JSON.stringify(fixtureData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `face_${currentFace.face}_fixture.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);

    if (capturedPhotoUri) {
      const imgLink = document.createElement('a');
      imgLink.href = capturedPhotoUri;
      imgLink.download = `face_${currentFace.face}_fixture.png`;
      document.body.appendChild(imgLink);
      imgLink.click();
      document.body.removeChild(imgLink);
    }
  }, [currentFaceStickers, currentFace.face, dimension, capturedPhotoUri]);

  // Confirm Face & Advance
  const handleConfirmFace = () => {
    if (!currentFaceStickers || !currentFaceDetections) return;
    if (currentFaceStickers.some((c) => c === 'unknown')) return;

    const updatedDetections = {
      ...scannedFaceDetections,
      [currentFace.face]: currentFaceDetections,
    };
    setScannedFaceDetections(updatedDetections);
    setIsReviewing(false);
    setCurrentFaceStickers(null);
    setCurrentFaceDetections(null);
    setCapturedPhotoUri(null);

    if (currentFaceIndex < FACE_ORDER.length - 1) {
      setCurrentFaceIndex((prev) => prev + 1);
    } else {
      // Rule 2e: All 6 faces scanned - execute joint assignment
      const jointResult = jointCubeAssignment(updatedDetections, dimension);
      if (!jointResult.isValid && jointResult.changedStickers.length > 0) {
        setJointIssue('Adjusted ambiguous stickers to satisfy standard cube color counts.');
      }
      onScanComplete(jointResult.faces);
      onClose();
    }
  };

  if (!visible) return null;

  // Permission request screen
  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.permissionCard}>
            <Camera color="#22D3EE" size={36} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              SolvaCube uses your device camera to recognize sticker colors on your cube.
              All image processing runs 100% on-device and your video is never recorded or uploaded.
            </Text>

            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const screenW = Dimensions.get('window').width;
  const reviewBoxSize = Math.min(320, screenW - 48);
  const reviewCellSize = reviewBoxSize / dimension;
  const hasUnknownCell = currentFaceStickers?.some((c) => c === 'unknown');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close scanner">
            <X color="#F8FAFC" size={24} />
          </TouchableOpacity>
          <View style={styles.stepInfo}>
            <Text style={styles.stepCounter}>
              Face {currentFaceIndex + 1} of 6: {currentFace.centerColorName} centre in the middle
            </Text>
            <Text style={[styles.stepFaceName, { color: currentFace.color }]}>{currentFace.name}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Viewfinder Preview Area */}
        <View
          style={styles.previewContainer}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setContainerLayout({ width, height });
            }
          }}
        >
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />

          {/* On-screen 85% Grid Overlay with Live Color Dots (Rule 2c & 2f) */}
          {!isReviewing && (
            <View style={[styles.gridOverlay, { width: gridBoxSize, height: gridBoxSize }]}>
              {Array.from({ length: dimension }).map((_, r) => (
                <View key={`r-${r}`} style={styles.gridRow}>
                  {Array.from({ length: dimension }).map((__, c) => {
                    const idx = r * dimension + c;
                    const live = liveDetections ? liveDetections[idx] : null;
                    const dotColor = live
                      ? (live.color === 'unknown' ? '#64748B' : (PALETTE[live.color] || '#64748B'))
                      : 'transparent';
                    const isAmb = live?.isAmbiguous;

                    return (
                      <View
                        key={`c-${c}`}
                        style={[
                          styles.gridCellBorder,
                          {
                            width: cellSize,
                            height: cellSize,
                            borderColor: 'rgba(255,255,255,0.45)',
                          },
                        ]}
                      >
                        {live && (
                          <View
                            style={[
                              styles.liveDot,
                              {
                                backgroundColor: dotColor,
                                borderColor: isAmb ? '#EF4444' : '#FFFFFF',
                              },
                            ]}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Confirm Face Dialog (Rule 2g, 2h) */}
          {isReviewing && currentFaceStickers && (
            <View style={styles.reviewOverlay}>
              <ScrollView contentContainerStyle={styles.reviewScrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewTitle}>Confirm Face Colors</Text>
                  <Text style={styles.reviewSubtitle}>
                    Tap any sticker with a warning ring to correct its colour:
                  </Text>

                  {/* Captured Photo with Overlaid Grid (Rule 2g) */}
                  <View style={[styles.photoWrap, { width: reviewBoxSize, height: reviewBoxSize }]}>
                    {capturedPhotoUri ? (
                      <Image
                        source={{ uri: capturedPhotoUri }}
                        style={{ width: reviewBoxSize, height: reviewBoxSize, borderRadius: 12 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.photoFallback, { width: reviewBoxSize, height: reviewBoxSize }]} />
                    )}

                    {/* Overlaid 3x3 Grid of detected color squares */}
                    <View style={[styles.reviewGridOverlay, { width: reviewBoxSize, height: reviewBoxSize }]}>
                      {Array.from({ length: dimension }).map((_, r) => (
                        <View key={`rr-${r}`} style={styles.gridRow}>
                          {Array.from({ length: dimension }).map((__, c) => {
                            const idx = r * dimension + c;
                            const col = currentFaceStickers[idx];
                            const det = currentFaceDetections ? currentFaceDetections[idx] : null;
                            const isSelected = selectedCellIdx === idx;
                            const isWarn = det?.isAmbiguous || (det?.confidence ?? 1) < 0.35 || col === 'unknown';

                            return (
                              <TouchableOpacity
                                key={`rc-${c}`}
                                style={[
                                  styles.reviewCellTouchable,
                                  { width: reviewCellSize, height: reviewCellSize },
                                ]}
                                onPress={() => setSelectedCellIdx(idx)}
                                activeOpacity={0.8}
                              >
                                <View
                                  style={[
                                    styles.colorBadge,
                                    {
                                      backgroundColor: col === 'unknown' ? '#475569' : (PALETTE[col as CubeColor] || '#94A3B8'),
                                    },
                                    isSelected && styles.badgeSelected,
                                    isWarn && !isSelected && styles.badgeWarning,
                                  ]}
                                >
                                  {col === 'unknown' ? (
                                    <Text style={styles.unknownText}>?</Text>
                                  ) : isWarn ? (
                                    <AlertTriangle size={12} color="#EF4444" />
                                  ) : null}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* 6-Color Palette Picker (Rule 2g) */}
                  <View style={styles.pickerSection}>
                    <Text style={styles.pickerHint}>
                      Change cell {selectedCellIdx + 1} ({Math.floor(selectedCellIdx / dimension) + 1},{selectedCellIdx % dimension + 1}):
                    </Text>
                    <View style={styles.paletteRow}>
                      {CUBE_COLORS.map((col) => (
                        <TouchableOpacity
                          key={col}
                          style={[
                            styles.paletteSwatch,
                            { backgroundColor: PALETTE[col] },
                            currentFaceStickers[selectedCellIdx] === col && styles.swatchActive,
                          ]}
                          onPress={() => handleSelectColorForCell(col)}
                          activeOpacity={0.7}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Dev-only Action Buttons (Step 1 & Step 3) */}
                  {__DEV__ && (
                    <View style={styles.devActionsRow}>
                      <TouchableOpacity style={styles.devBtn} onPress={handleSaveDebugCapture}>
                        <Download size={13} color="#22D3EE" />
                        <Text style={styles.devBtnText}>Save debug</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.devBtn} onPress={handleSaveAsFixture}>
                        <Database size={13} color="#A78BFA" />
                        <Text style={styles.devBtnText}>Save fixture</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Retake / Next Face Actions */}
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => {
                        setIsReviewing(false);
                        setCurrentFaceStickers(null);
                        setCurrentFaceDetections(null);
                        setCapturedPhotoUri(null);
                      }}
                    >
                      <RefreshCw color="#CBD5E1" size={16} />
                      <Text style={styles.retakeBtnText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmBtn, hasUnknownCell && styles.confirmBtnDisabled]}
                      onPress={handleConfirmFace}
                      disabled={hasUnknownCell}
                    >
                      <Check color="#0F172A" size={16} />
                      <Text style={styles.confirmBtnText}>
                        {currentFaceIndex < 5 ? 'Next Face' : 'Finish Scan'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Bottom Control Bar in Live Preview (Rule 2c) */}
        {!isReviewing && (
          <View style={styles.bottomBar}>
            <Text style={styles.helperText}>Fill the grid with one face, hold it flat to the camera</Text>
            <TouchableOpacity style={styles.snapBtn} onPress={handleSnap} activeOpacity={0.75} accessibilityLabel="Take snapshot">
              <View style={styles.snapBtnInner} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionCard: { backgroundColor: '#151C2B', borderRadius: 20, padding: 24, alignItems: 'center', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)' },
  permissionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  permissionText: { color: '#94A3B8', fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 20 },
  grantBtn: { backgroundColor: '#22D3EE', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 10 },
  grantBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 14 },
  cancelBtn: { paddingVertical: 10, width: '100%', alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 13 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepInfo: { alignItems: 'center' },
  stepCounter: { color: '#CBD5E1', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  stepFaceName: { fontSize: 15, fontWeight: '800', marginTop: 2 },

  previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  gridOverlay: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)' },
  gridRow: { flexDirection: 'row', flex: 1 },
  gridCellBorder: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },

  bottomBar: { paddingVertical: 20, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  helperText: { color: '#F1F5F9', fontSize: 13, fontWeight: '600', marginBottom: 14, textAlign: 'center', paddingHorizontal: 20 },
  snapBtn: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  snapBtnInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#22D3EE' },

  reviewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.95)', zIndex: 20 },
  reviewScrollContent: { paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  reviewCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 18, alignItems: 'center', width: '100%', maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  reviewTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  reviewSubtitle: { color: '#94A3B8', fontSize: 12, marginBottom: 14, textAlign: 'center' },

  photoWrap: { borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 14, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  photoFallback: { backgroundColor: '#0F172A' },
  reviewGridOverlay: { position: 'absolute', top: 0, left: 0 },
  reviewCellTouchable: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  colorBadge: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#000000' },
  badgeSelected: { borderColor: '#22D3EE', borderWidth: 3, transform: [{ scale: 1.15 }] },
  badgeWarning: { borderColor: '#EF4444', borderWidth: 2.5 },
  unknownText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  pickerSection: { width: '100%', alignItems: 'center', marginBottom: 16 },
  pickerHint: { color: '#CBD5E1', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  paletteRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  paletteSwatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  swatchActive: { borderColor: '#22D3EE', borderWidth: 3, transform: [{ scale: 1.12 }] },

  devActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, width: '100%', justifyContent: 'center' },
  devBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#334155' },
  devBtnText: { color: '#E2E8F0', fontSize: 11, fontWeight: '700' },

  reviewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#334155' },
  retakeBtnText: { color: '#E2E8F0', fontWeight: '700', fontSize: 13 },
  confirmBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#22D3EE' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
});
