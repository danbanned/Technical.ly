import React, { memo } from 'react';
import styles from './StatCard.module.css';

const SEVERITY_COLORS = {
  high: 'var(--mismatch-alert)',
  medium: 'var(--secondary-capital)',
  low: 'var(--primary-innovation)',
};

/**
 * StatCard
 *
 * A single anchored card. Positioned absolutely from screen
 * coordinates produced by useBoardAnchoring. Reads its value from
 * the supplied `stats` object using the key in its config.
 */
function StatCard({ config, screenPosition, isIdle, stats, animDelayMs = 0 }) {
  const {
    icon,
    label,
    colorToken,
    isMismatch,
    progressBar,
    trendIndicator,
    secondaryMetric,
    dataKey,
    formatValue,
    renderContent,
  } = config;

  if (
    !screenPosition ||
    screenPosition.x < -100 ||
    screenPosition.y < -100
  ) {
    return null;
  }

  const rawValue = dataKey ? stats?.[dataKey] : null;
  const mismatch = isMismatch && renderContent ? renderContent(stats || {}) : null;
  const displayValue = mismatch
    ? mismatch
    : formatValue
    ? formatValue(rawValue)
    : rawValue;

  const progressValue = progressBar
    ? Math.min(
        (Number(stats?.[progressBar.dataKey]) || 0) / progressBar.max,
        1
      )
    : 0;

  const positionStyle = {
    left: `${screenPosition.x}px`,
    top: `${screenPosition.y}px`,
    transform: 'translate(-50%, -50%)',
    willChange: isIdle ? 'auto' : 'transform',
    animationDelay: `${animDelayMs}ms`,
  };

  const trendValue = trendIndicator ? stats?.[trendIndicator.dataKey] : null;
  const trendIsUp =
    trendIndicator && trendValue != null
      ? (trendValue > 0) === trendIndicator.positiveIsGood
      : true;

  const ariaSummary =
    typeof displayValue === 'object' && displayValue !== null
      ? displayValue.headline
      : displayValue;

  return (
    <div
      className={`${styles.statCard} board-card-anim ${isIdle ? styles.snapped : ''}`}
      style={positionStyle}
      role={isMismatch ? 'alert' : 'complementary'}
      aria-label={`${label}: ${ariaSummary}`}
    >
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">{icon}</span>
        <span className={styles.label} style={{ color: `var(${colorToken})` }}>
          {label}
        </span>
      </div>

      {mismatch ? (
        <div className={styles.mismatchContent}>
          <span
            className={styles.headline}
            style={{ color: SEVERITY_COLORS[mismatch.severity] }}
          >
            {mismatch.headline}
          </span>
          <span className={styles.detail}>{mismatch.detail}</span>
        </div>
      ) : (
        <>
          <span
            className={styles.value}
            style={{ color: `var(${colorToken})` }}
          >
            {displayValue}
          </span>

          {progressBar && (
            <div className={styles.progressBar} aria-hidden="true">
              <div
                className={styles.progressFill}
                style={{
                  width: `${progressValue * 100}%`,
                  backgroundColor: `var(${colorToken})`,
                }}
              />
            </div>
          )}

          {secondaryMetric && (
            <span className={styles.secondary}>
              {stats?.[secondaryMetric.dataKey] ?? '—'} {secondaryMetric.label}
            </span>
          )}

          {trendIndicator && trendValue != null && (
            <span
              className={`${styles.trend} ${trendIsUp ? styles.trendUp : styles.trendDown}`}
            >
              {trendIndicator.format(trendValue)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default memo(StatCard);
