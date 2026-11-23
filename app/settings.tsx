import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  Modal,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Volume2,
  Vibrate,
  Gauge,
  Moon,
  Eye,
  Shield,
  FileText,
  Highlighter,
  Sun,
  Type,
  Code2,
  X,
  RotateCcw,
  Terminal,
} from 'lucide-react-native';
import { debugLogger } from '../src/services/debugLogger';
import {
  useSettingsStore,
  AnimationSpeedOption,
  AutoViewOption,
  HighlightStrengthOption,
  HighlightStyleOption,
} from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { adService } from '../src/services/adService';
import { adController } from '../src/ads/adController';
import { hapticFeedback } from '../src/services/hapticsService';
import { OPEN_SOURCE_LICENSES } from '../src/constants/licensesData';
import { PRIVACY_POLICY_URL } from '../src/constants/links';
import { AquaticBackground } from '../src/components/common/AquaticBackground';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const speedOption = useSettingsStore((s) => s.speedOption);
  const autoViewMode = useSettingsStore((s) => s.autoViewMode);
  const highlightStrength = useSettingsStore((s) => s.highlightStrength);
  const highlightStyle = useSettingsStore((s) => s.highlightStyle);
  const showColorBlindLetters = useSettingsStore((s) => s.showColorBlindLetters);
  const isColorBlindMode = useSettingsStore((s) => s.isColorBlindMode);

  const setIsDarkMode = useSettingsStore((s) => s.setIsDarkMode);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setSpeedOption = useSettingsStore((s) => s.setSpeedOption);
  const setAutoViewMode = useSettingsStore((s) => s.setAutoViewMode);
  const setHighlightStrength = useSettingsStore((s) => s.setHighlightStrength);
  const setHighlightStyle = useSettingsStore((s) => s.setHighlightStyle);
  const setShowColorBlindLetters = useSettingsStore((s) => s.setShowColorBlindLetters);
  const setIsColorBlindMode = useSettingsStore((s) => s.setIsColorBlindMode);

  const [showLicensesModal, setShowLicensesModal] = useState(false);
  const [showDebugLogsModal, setShowDebugLogsModal] = useState(false);
  const [devSimulation, setDevSimulation] = useState(adController.getState().devSimulationMode);

  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const handleConsentManage = async () => {
    hapticFeedback.light();
    await adService.showConsentFormAgain();
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
      Alert.alert(
        'Privacy Policy',
        'SolvaCube respects your privacy. We do not collect or sell personal data. Google AdMob and UMP collect diagnostic and ad-related identifiers only.'
      );
    });
  };

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch {
      router.replace('/');
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }
  }, []);

  return (
    <AquaticBackground>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.navHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={Platform.OS !== 'web' ? { top: 12, bottom: 12, left: 12, right: 12 } : undefined}
        >
          <ArrowLeft color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* SOLVER & 3D ANIMATION */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>3D SOLVER & ANIMATION</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Animation Speed: Very slow (4500ms) / Slow (2800ms) / Normal (1400ms) / Fast (700ms) */}
          <View style={styles.optionColumn}>
            <View style={styles.optionHeaderRow}>
              <View style={styles.iconTitleRow}>
                <Gauge color={theme.primary} size={20} />
                <Text style={[styles.rowLabel, { color: theme.text }]}>Animation Speed</Text>
              </View>
              <Text style={[styles.optionValueText, { color: theme.primary }]}>
                {speedOption === 'very_slow'
                  ? 'Very slow (4.5s)'
                  : speedOption === 'slow'
                  ? 'Slow (2.8s)'
                  : speedOption === 'fast'
                  ? 'Fast (0.7s)'
                  : 'Normal (1.4s)'}
              </Text>
            </View>

            <View style={styles.segmentedControl}>
              {(['very_slow', 'slow', 'normal', 'fast'] as AnimationSpeedOption[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.segmentButton,
                    speedOption === opt && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSpeedOption(opt);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: speedOption === opt ? '#0B1120' : theme.textSecondary },
                      speedOption === opt && { fontWeight: '800' },
                    ]}
                  >
                    {opt === 'very_slow'
                      ? 'V.Slow'
                      : opt === 'slow'
                      ? 'Slow'
                      : opt === 'fast'
                      ? 'Fast'
                      : 'Normal'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Auto View: Off / Minimal / Always */}
          <View style={styles.optionColumn}>
            <View style={styles.optionHeaderRow}>
              <View style={styles.iconTitleRow}>
                <Eye color={theme.primary} size={20} />
                <Text style={[styles.rowLabel, { color: theme.text }]}>Auto View Camera</Text>
              </View>
              <Text style={[styles.optionValueText, { color: theme.primary }]}>
                {autoViewMode === 'minimal'
                  ? 'Minimal (eased, $\\le$ 70°)'
                  : autoViewMode === 'always'
                  ? 'Always follow'
                  : 'Off'}
              </Text>
            </View>

            <View style={styles.segmentedControl}>
              {(['off', 'minimal', 'always'] as AutoViewOption[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.segmentButton,
                    autoViewMode === opt && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setAutoViewMode(opt);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: autoViewMode === opt ? '#0B1120' : theme.textSecondary },
                      autoViewMode === opt && { fontWeight: '800' },
                    ]}
                  >
                    {opt === 'off' ? 'Off' : opt === 'minimal' ? 'Minimal' : 'Always'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Highlight Style: Glass belt (default) / Outline / Off */}
          <View style={styles.optionColumn}>
            <View style={styles.optionHeaderRow}>
              <View style={styles.iconTitleRow}>
                <Highlighter color={theme.primary} size={20} />
                <Text style={[styles.rowLabel, { color: theme.text }]}>Highlight Style</Text>
              </View>
              <Text style={[styles.optionValueText, { color: theme.primary }]}>
                {highlightStyle === 'glass_belt'
                  ? 'Glass belt (default)'
                  : highlightStyle === 'outline'
                  ? 'Outline (thin 3px loop)'
                  : 'Off'}
              </Text>
            </View>

            <View style={styles.segmentedControl}>
              {(['glass_belt', 'outline', 'off'] as HighlightStyleOption[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.segmentButton,
                    highlightStyle === opt && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setHighlightStyle(opt);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: highlightStyle === opt ? '#0B1120' : theme.textSecondary },
                      highlightStyle === opt && { fontWeight: '800' },
                    ]}
                  >
                    {opt === 'glass_belt' ? 'Glass belt' : opt === 'outline' ? 'Outline' : 'Off'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Highlight Strength: Subtle / Medium / Strong */}
          <View style={styles.optionColumn}>
            <View style={styles.optionHeaderRow}>
              <View style={styles.iconTitleRow}>
                <Sun color={theme.primary} size={20} />
                <Text style={[styles.rowLabel, { color: theme.text }]}>Highlight Strength</Text>
              </View>
              <Text style={[styles.optionValueText, { color: theme.primary }]}>
                {highlightStrength === 'subtle'
                  ? 'Subtle (10%)'
                  : highlightStrength === 'medium'
                  ? 'Medium (16%)'
                  : 'Strong (22%)'}
              </Text>
            </View>

            <View style={styles.segmentedControl}>
              {(['subtle', 'medium', 'strong'] as HighlightStrengthOption[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.segmentButton,
                    highlightStrength === opt && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setHighlightStrength(opt);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: highlightStrength === opt ? '#0B1120' : theme.textSecondary },
                      highlightStrength === opt && { fontWeight: '800' },
                    ]}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Colour-blind letters on stickers */}
          <View style={styles.row}>
            <View style={styles.iconTitleRow}>
              <Type color={theme.primary} size={20} />
              <View>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Colour-Blind Letters</Text>
                <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                  Draws W, Y, G, B, R, O on every sticker
                </Text>
              </View>
            </View>
            <Switch
              value={showColorBlindLetters}
              onValueChange={(val) => {
                hapticFeedback.light();
                setShowColorBlindLetters(val);
                setIsColorBlindMode(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* FEEDBACK & THEME */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>DEVICE & THEME</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.iconTitleRow}>
              <Moon color={theme.primary} size={20} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={(val) => {
                hapticFeedback.light();
                setIsDarkMode(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <View style={styles.iconTitleRow}>
              <Volume2 color={theme.primary} size={20} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>Sound Effects</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(val) => {
                hapticFeedback.light();
                setSoundEnabled(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <View style={styles.iconTitleRow}>
              <Vibrate color={theme.primary} size={20} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>Haptic Feedback</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={(val) => {
                hapticFeedback.light();
                setHapticsEnabled(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* PRIVACY & ADS */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>PRIVACY & ADS</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.row} onPress={handleConsentManage}>
            <View style={styles.iconTitleRow}>
              <Shield color={theme.primary} size={20} />
              <View>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Manage Ad Consent (UMP)</Text>
                <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                  Update your GDPR / EEA privacy preferences
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity style={styles.row} onPress={handlePrivacyPolicy}>
            <View style={styles.iconTitleRow}>
              <FileText color={theme.primary} size={20} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>Privacy Policy</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowLicensesModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Open-source licences"
          >
            <View style={styles.iconTitleRow}>
              <Code2 color={theme.primary} size={20} />
              <View>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Open-source licences</Text>
                <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                  View third-party software notices
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* DEVELOPER OPTIONS (Only visible in development mode) */}
        {typeof __DEV__ !== 'undefined' && __DEV__ && (
          <>
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>DEVELOPER OPTIONS</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.row}>
                <View style={styles.iconTitleRow}>
                  <Code2 color={theme.primary} size={20} />
                  <View>
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Simulate Ads</Text>
                    <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                      Test rewarded & interstitial flows without Play Services
                    </Text>
                  </View>
                </View>
                <Switch
                  value={devSimulation}
                  onValueChange={async (val) => {
                    setDevSimulation(val);
                    await adController.setDevSimulationMode(val);
                  }}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.row}
                onPress={async () => {
                  await adController.resetState();
                  await adController.initialize();
                  Alert.alert('Reset Complete', 'Ad counters and cooldown timers have been reset.');
                }}
              >
                <View style={styles.iconTitleRow}>
                  <RotateCcw color="#EF4444" size={20} />
                  <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Reset Ad Timers & Counters</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.row}
                onPress={() => setShowDebugLogsModal(true)}
              >
                <View style={styles.iconTitleRow}>
                  <Terminal color={theme.primary} size={20} />
                  <View>
                    <Text style={[styles.rowLabel, { color: theme.text }]}>View Lifecycle & Debug Logs</Text>
                    <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                      Inspect startup events, errors and timeouts
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* App Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            SolvaCube v1.0.0 · Production Build
          </Text>
        </View>
      </ScrollView>

      {/* Open-Source Licences Modal */}
      <Modal
        visible={showLicensesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLicensesModal(false)}
      >
        <SafeAreaView style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Open-Source Licences</Text>
              <TouchableOpacity
                onPress={() => setShowLicensesModal(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X color={theme.text} size={22} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={true}>
              {OPEN_SOURCE_LICENSES.map((pkg) => (
                <View key={pkg.name} style={[styles.licenseItem, { borderBottomColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.pkgName, { color: theme.text }]}>{pkg.name}</Text>
                    <View style={styles.licenseBadge}>
                      <Text style={styles.licenseBadgeText}>{pkg.license}</Text>
                    </View>
                  </View>
                  <Text style={[styles.pkgVersion, { color: theme.textSecondary }]}>v{pkg.version}</Text>
                  <Text style={[styles.pkgAuthor, { color: theme.textSecondary }]}>{pkg.author}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Debug Logs Modal (Dev Only) */}
      {typeof __DEV__ !== 'undefined' && __DEV__ && (
        <Modal
          visible={showDebugLogsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDebugLogsModal(false)}
        >
          <SafeAreaView style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Lifecycle & Debug Logs</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Last 50 recorded events</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDebugLogsModal(false)}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X color={theme.text} size={22} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 380, padding: 8 }} showsVerticalScrollIndicator={true}>
                {debugLogger.getLogs().length === 0 ? (
                  <Text style={{ color: theme.textSecondary, textAlign: 'center', padding: 20 }}>No logs recorded yet.</Text>
                ) : (
                  debugLogger.getLogs().map((item, idx) => (
                    <View key={idx} style={{ marginBottom: 8, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: theme.border }}>
                      <Text style={{ color: item.level === 'error' ? '#EF4444' : item.level === 'warn' ? '#F59E0B' : '#06B6D4', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' }}>
                        [{item.timestamp}] [{item.level.toUpperCase()}]
                      </Text>
                      <Text style={{ color: theme.text, fontSize: 12, marginTop: 2 }}>{item.message}</Text>
                      {item.details && (
                        <Text style={{ color: theme.textSecondary, fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{item.details}</Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  </AquaticBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  optionColumn: {
    padding: 14,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  optionValueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginLeft: 46,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  licenseItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pkgName: {
    fontSize: 14,
    fontWeight: '700',
  },
  licenseBadge: {
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  licenseBadgeText: {
    color: '#FFB400',
    fontSize: 11,
    fontWeight: '700',
  },
  pkgVersion: {
    fontSize: 12,
    marginTop: 2,
  },
  pkgAuthor: {
    fontSize: 11,
    marginTop: 2,
  },
});
