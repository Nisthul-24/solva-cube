import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle, RefreshCw, ArrowLeft, Terminal } from 'lucide-react-native';
import { debugLogger } from '../services/debugLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showLogs: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showLogs: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    debugLogger.error('ErrorBoundary caught error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showLogs: false });
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showLogs: false });
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  };

  toggleLogs = () => {
    this.setState((prev) => ({ showLogs: !prev.showLogs }));
  };

  render() {
    if (this.state.hasError) {
      const logs = debugLogger.getLogs();

      return (
        <View style={styles.container}>
          <View style={styles.iconBox}>
            <AlertCircle color="#EF4444" size={44} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            SolvaCube caught an unexpected error. You can safely go back or try again.
          </Text>
          <Text style={styles.details}>{this.state.error?.message}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={this.handleGoBack}>
              <ArrowLeft color="#CBD5E1" size={18} />
              <Text style={styles.btnSecondaryText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
              <RefreshCw color="#FFFFFF" size={18} />
              <Text style={styles.btnText}>Try Again</Text>
            </TouchableOpacity>
          </View>

          {/* Diagnostic logs toggle */}
          <TouchableOpacity style={styles.logToggleBtn} onPress={this.toggleLogs}>
            <Terminal color="#94A3B8" size={14} />
            <Text style={styles.logToggleText}>
              {this.state.showLogs ? 'Hide Diagnostics' : 'View Diagnostics & Logs'}
            </Text>
          </TouchableOpacity>

          {this.state.showLogs && (
            <View style={styles.logBox}>
              <ScrollView style={styles.logScroll}>
                <Text style={styles.logHeader}>Error Stack:</Text>
                <Text style={styles.logMono}>{this.state.error?.stack || 'No stack trace'}</Text>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <Text style={styles.logHeader}>Component Stack:</Text>
                    <Text style={styles.logMono}>{this.state.errorInfo.componentStack}</Text>
                  </>
                )}
                <Text style={styles.logHeader}>Recent Lifecycle Logs ({logs.length}):</Text>
                {logs.map((item, idx) => (
                  <Text key={idx} style={[styles.logMono, item.level === 'error' && styles.logError]}>
                    [{item.timestamp}] [{item.level.toUpperCase()}] {item.message}
                    {item.details ? `\n  ${item.details}` : ''}
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  btnSecondaryText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 15,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  message: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  details: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  logToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  logToggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  logBox: {
    marginTop: 12,
    width: '100%',
    maxHeight: 220,
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
  },
  logScroll: {
    flex: 1,
  },
  logHeader: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  logMono: {
    color: '#E2E8F0',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
    marginBottom: 4,
  },
  logError: {
    color: '#F87171',
  },
});
