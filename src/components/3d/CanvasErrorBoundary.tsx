import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RotateCcw, AlertTriangle, Layers } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  onResetCamera?: () => void;
  onSwitchToNet?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CanvasErrorBoundary caught 3D render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onResetCamera?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallbackContainer}>
          <AlertTriangle size={36} color="#22d3ee" style={styles.icon} />
          <Text style={styles.title}>Couldn't update 3D view</Text>
          <Text style={styles.subtitle}>
            {this.state.error?.message || 'A 3D rendering or GL context error occurred.'}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry 3D view"
              activeOpacity={0.8}
            >
              <RotateCcw size={16} color="#0B1120" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>

            {this.props.onSwitchToNet && (
              <TouchableOpacity
                style={styles.netButton}
                onPress={this.props.onSwitchToNet}
                accessibilityRole="button"
                accessibilityLabel="Switch to 2D Net View"
                activeOpacity={0.8}
              >
                <Layers size={16} color="#FFB400" />
                <Text style={styles.netButtonText}>2D Net View</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22d3ee',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1120',
  },
  netButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#221F1B',
    borderWidth: 1,
    borderColor: '#3A352E',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  netButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFB400',
  },
});

