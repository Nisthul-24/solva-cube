import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Sparkles,
  Type,
} from 'lucide-react-native';
import {
  useSettingsStore,
  AnimationSpeedOption,
  AutoViewOption,
  HighlightStrengthOption,
  HighlightStyleOption,
} from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { adService } from '../src/services/adService';
import { hapticFeedback } from '../src/services/hapticsService';

export default function SettingsScreen() {
  const router = useRouter();
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

  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const handleConsentManage = async () => {
    hapticFeedback.light();
    await adService.showConsentFormAgain();
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://solvacube.app/privacy-policy.html').catch(() => {
      Alert.alert(
        'Privacy Policy',
        'SolvaCube respects your privacy. We do not collect or sell personal data. Google AdMob and UMP collect diagnostic and ad-related identifiers only.'
      );
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.navHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                <Sparkles color={theme.primary} size={20} />
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
                <Sparkles color={theme.primary} size={20} />
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
        </View>

        {/* App Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>
            SolvaCube v1.0.0 · Production Build
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
});
