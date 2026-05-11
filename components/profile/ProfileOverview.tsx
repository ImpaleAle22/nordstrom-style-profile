/**
 * Profile Overview Section
 * Radar chart + top pillars list with gradient bars
 */

'use client';

import { useEffect, useRef } from 'react';

interface ProfileOverviewProps {
  pillars: Record<string, number>;
  customerName: string;
}

export default function ProfileOverview({ pillars, customerName }: ProfileOverviewProps) {
  const radarChartRef = useRef<HTMLDivElement>(null);
  const firstName = customerName.split(' ')[0];

  // Sort and get top 5 pillars
  const topPillars = Object.entries(pillars)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  // Calculate chart max (rounded up to nearest 5) - SAME as radar chart
  const allScores = topPillars.map(([, w]) => w);
  const maxScore = Math.max(...allScores);
  const chartMax = Math.ceil(maxScore / 5) * 5;

  // Calculate gradient colors - EXACT match to radar chart dot colors
  const getGradientColor = (score: number, chartMax: number) => {
    const gradientPosition = Math.min(1, score / chartMax);

    let r: number, g: number, b: number;

    if (gradientPosition < 0.33) {
      // Coral to Pink
      const localPos = gradientPosition / 0.33;
      r = Math.round(229 + (212 - 229) * localPos);
      g = Math.round(173 + (165 - 173) * localPos);
      b = Math.round(165 + (165 - 165) * localPos);
    } else if (gradientPosition < 0.66) {
      // Pink to Lavender
      const localPos = (gradientPosition - 0.33) / 0.33;
      r = Math.round(212 + (200 - 212) * localPos);
      g = Math.round(165 + (181 - 165) * localPos);
      b = Math.round(165 + (214 - 165) * localPos);
    } else {
      // Lavender to Blue
      const localPos = (gradientPosition - 0.66) / 0.34;
      r = Math.round(200 + (125 - 200) * localPos);
      g = Math.round(181 + (177 - 181) * localPos);
      b = Math.round(214 + (209 - 214) * localPos);
    }

    return `rgb(${r}, ${g}, ${b})`;
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Load radar chart when component mounts
  useEffect(() => {
    const renderChart = () => {
      if (typeof window !== 'undefined') {
        // Check if StyleRadarChart is available
        const StyleRadarChart = (window as any).StyleRadarChart;

        if (StyleRadarChart) {
          // Normalize pillar names
          const normalizedPillars: Record<string, number> = {};
          for (const [key, value] of Object.entries(pillars)) {
            const normalizedKey = key.toLowerCase();
            if (normalizedKey === 'fashion_forward' || normalizedKey === 'fashionforward') {
              normalizedPillars.fashionForward = value;
            } else {
              normalizedPillars[key] = value;
            }
          }

          // Ensure all expected pillars exist
          const completePillars = {
            romantic: 0,
            bohemian: 0,
            casual: 0,
            classic: 0,
            minimal: 0,
            maximal: 0,
            fashionForward: 0,
            athletic: 0,
            utility: 0,
            ...normalizedPillars
          };

          // Default "before" profile
          const beforeProfile = {
            romantic: 11,
            bohemian: 11,
            casual: 11,
            classic: 11,
            minimal: 12,
            maximal: 11,
            fashionForward: 11,
            athletic: 11,
            utility: 11
          };

          console.log('🎯 Rendering radar chart with pillars:', completePillars);

          StyleRadarChart.render('styleRadarChart', {
            profileBefore: beforeProfile,
            profileAfter: completePillars,
            showBeforeProfile: false,
            animateDuration: 1000
          });

          console.log('✅ Radar chart rendered successfully');
        } else {
          console.log('⏳ Waiting for StyleRadarChart library...');
          setTimeout(renderChart, 100);
        }
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(renderChart, 100);
  }, [pillars]);

  return (
    <div className="style-profile-section">
      <div className="style-profile-header">
        <h3 className="style-profile-header-title">{firstName}'s Style Profile</h3>
        <div className="style-profile-header-subtitle">Top style pillars and recommendations</div>
      </div>

      <div className="style-profile-overview">
        {/* Radar Chart */}
        <div className="style-profile-left">
          <div ref={radarChartRef} id="styleRadarChart"></div>
        </div>

        {/* Top Pillars List */}
        <div className="style-profile-right">
          <div id="topPillarsList">
            {topPillars.map(([name, weight]) => {
              const displayName = name === 'fashionForward' ? 'Fashion Forward' : capitalizeFirstLetter(name);
              const gradient = getGradientColor(weight, chartMax);
              const barWidth = weight;

              return (
                <div key={name} className="pillar-item">
                  <div className="pillar-item-left">
                    <span className="pillar-name">{displayName}</span>
                  </div>
                  <div className="pillar-bar-container">
                    <div
                      className="pillar-bar-fill"
                      style={{ width: `${barWidth}%`, background: gradient }}
                    ></div>
                    <span className="pillar-percentage">{weight}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
