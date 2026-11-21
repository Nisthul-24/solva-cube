import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Upload, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { classifyStickerPatch, StickerDetectionResult, CubeColor, REFERENCE_PALETTE } from '../src/camera/colorClassifier';
import { decodeJpeg, sampleStickerGridFromImage } from '../src/camera/imageSampler';
import { PALETTE } from '../src/components/3d/stickerLayout';

export default function CameraTestScreen() {
  const router = useRouter();
  const isProd = typeof __DEV__ !== 'undefined' && !__DEV__;

  useEffect(() => {
    if (isProd) {
      router.replace('/');
    }
  }, [router, isProd]);

  const [dimension, setDimension] = useState<2 | 3 | 4>(3);
  const [results, setResults] = useState<StickerDetectionResult[] | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Select an image to test color detection');

  const handleFileSelect = async (e: any) => {
    try {
      const file = e.target?.files?.[0];
      if (!file) return;

      setStatusMessage(`Decoding ${file.name}...`);
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Decode JPEG using pure-JS jpeg-js
      const decoded = decodeJpeg(uint8);
      setStatusMessage(`Image decoded: ${decoded.width}x${decoded.height}. Sampling ${dimension}x${dimension} grid...`);

      const detections = sampleStickerGridFromImage(decoded, dimension);
      setResults(detections);

      const ambiguousCount = detections.filter((d: StickerDetectionResult) => d.isAmbiguous).length;
      setStatusMessage(`Detected ${detections.length} stickers (${ambiguousCount} ambiguous/low-confidence).`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error processing image: ${err.message}`);
    }
  };

  // Synthetic test generator for quick in-browser verification
  const handleRunSyntheticSample = () => {
    setStatusMessage(`Running synthetic sample for ${dimension}x${dimension}...`);
    const count = dimension * dimension;
    const testColors: CubeColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];
    const syntheticResults: StickerDetectionResult[] = [];

    for (let i = 0; i < count; i++) {
      const baseColor = testColors[i % testColors.length];
      const nominal = {
        white: { r: 245, g: 245, b: 245 },
        yellow: { r: 255, g: 215, b: 0 },
        green: { r: 0, g: 155, b: 72 },
        blue: { r: 0, g: 70, b: 173 },
        red: { r: 185, g: 0, b: 0 },
        orange: { r: 255, g: 88, b: 0 },
      }[baseColor];

      // Add mild noise
      const r = Math.max(0, Math.min(255, nominal.r + Math.round((Math.random() - 0.5) * 16)));
      const g = Math.max(0, Math.min(255, nominal.g + Math.round((Math.random() - 0.5) * 16)));
      const b = Math.max(0, Math.min(255, nominal.b + Math.round((Math.random() - 0.5) * 16)));

      syntheticResults.push(classifyStickerPatch({ r, g, b }));
    }

    setResults(syntheticResults);
    setStatusMessage(`Synthesized ${count} sticker samples.`);
  };

  if (isProd) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            try {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            } catch {
              router.replace('/');
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft color="#F8FAFC" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dev Camera Classifier Tester</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Dimension Selector */}
        <View style={styles.dimRow}>
          {([2, 3, 4] as const).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dimBtn, dimension === d && styles.dimBtnActive]}
              onPress={() => {
                setDimension(d);
                setResults(null);
              }}
            >
              <Text style={[styles.dimBtnText, dimension === d && styles.dimBtnTextActive]}>
                {d}x{d} Cube
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* File Chooser / Upload */}
        <View style={styles.uploadCard}>
          <Camera color="#22D3EE" size={32} />
          <Text style={styles.uploadTitle}>Choose Photo from Device</Text>
          <Text style={styles.uploadSubtitle}>Test detector accuracy and confidence on real photos</Text>

          {Platform.OS === 'web' && (
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              style={{ marginTop: 12, color: '#94A3B8' }}
            />
          )}

          <TouchableOpacity style={styles.syntheticBtn} onPress={handleRunSyntheticSample}>
            <Upload color="#0F172A" size={16} />
            <Text style={styles.syntheticBtnText}>Generate Synthetic Test Face</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.statusText}>{statusMessage}</Text>

        {/* Results Grid */}
        {results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Detected Sticker Grid ({dimension}x{dimension})</Text>

            <View style={[styles.gridContainer, { width: dimension * 68 }]}>
              {results.map((res, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.gridCell,
                    {
                      backgroundColor: res.color === 'unknown' ? '#64748B' : (PALETTE[res.color as CubeColor] || '#333'),
                      borderColor: res.isAmbiguous ? '#EF4444' : 'rgba(255,255,255,0.2)',
                      borderWidth: res.isAmbiguous ? 2.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.cellIndex, { color: res.color === 'white' || res.color === 'yellow' ? '#111' : '#FFF' }]}>
                    #{idx + 1}
                  </Text>
                  <Text style={[styles.cellColor, { color: res.color === 'white' || res.color === 'yellow' ? '#111' : '#FFF' }]}>
                    {res.color.toUpperCase()}
                  </Text>
                  <Text style={[styles.cellConf, { color: res.color === 'white' || res.color === 'yellow' ? '#333' : '#E2E8F0' }]}>
                    {(res.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>

            {/* Detailed per-sticker breakdown */}
            <Text style={[styles.resultsTitle, { marginTop: 20 }]}>Sticker Detail Table</Text>
            {results.map((res, idx) => (
              <View key={idx} style={styles.detailRow}>
                <View style={[styles.detailBadge, { backgroundColor: res.color === 'unknown' ? '#64748B' : (PALETTE[res.color as CubeColor] || '#333') }]}>
                  <Text style={{ fontWeight: '800', fontSize: 11, color: res.color === 'white' || res.color === 'yellow' ? '#111' : '#FFF' }}>
                    #{idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailColorText}>
                    {res.color.toUpperCase()} — Confidence: {(res.confidence * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.detailLabText}>
                    RGB: ({res.rawRgb.r}, {res.rawRgb.g}, {res.rawRgb.b}) | Lab: ({res.lab.L.toFixed(1)}, {res.lab.a.toFixed(1)}, {res.lab.b.toFixed(1)})
                  </Text>
                </View>
                {res.isAmbiguous ? (
                  <AlertTriangle color="#EF4444" size={18} />
                ) : (
                  <CheckCircle color="#10B981" size={18} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1120' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  dimRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dimBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dimBtnActive: { backgroundColor: '#22D3EE', borderColor: '#22D3EE' },
  dimBtnText: { color: '#94A3B8', fontWeight: '700', fontSize: 13 },
  dimBtnTextActive: { color: '#0F172A', fontWeight: '800' },
  uploadCard: {
    backgroundColor: '#151C2B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  uploadTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginTop: 10 },
  uploadSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4, textAlign: 'center' },
  syntheticBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#22D3EE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  syntheticBtnText: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  statusText: { color: '#94A3B8', fontSize: 13, marginVertical: 12, textAlign: 'center' },
  resultsCard: {
    backgroundColor: '#151C2B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  resultsTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignSelf: 'center' },
  gridCell: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIndex: { fontSize: 10, fontWeight: '800' },
  cellColor: { fontSize: 11, fontWeight: '800', marginVertical: 1 },
  cellConf: { fontSize: 10, fontWeight: '700' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  detailBadge: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  detailColorText: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  detailLabText: { color: '#94A3B8', fontSize: 10, marginTop: 2, fontFamily: 'monospace' },
});

