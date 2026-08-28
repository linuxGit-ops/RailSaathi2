/**
 * TrainResults.tsx — Train search results list (§31 step 2)
 */
import React from 'react';
import type { SearchResult } from '../../services/train-data';
import type { TravelGoal } from '../../services/ai-agent';
import TrainCard from './TrainCard';
import { MockBadge } from '../layout/MockBadge';

interface Props {
  goal: TravelGoal;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  language?: 'en' | 'hi';
}

const TrainResults: React.FC<Props> = ({ goal, results, onSelect, language = 'en' }) => {
  return (
    <div className="step-container anim-fade-in-up">
      <div className="step-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 className="step-title">
              {language === 'hi' ? 'ट्रेनें मिलीं' : 'Available trains'}
            </h2>
            <p className="step-subtitle text-muted">
              {goal.fromName} → {goal.toName}
              {' · '}
              {goal.dateRange[0]}
              {goal.dateRange.length > 1 ? ` – ${goal.dateRange[goal.dateRange.length - 1]}` : ''}
              {' · '}{goal.classCode}
            </p>
          </div>
          <MockBadge label="Sample data" />
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: 40 }}>🔍</span>
          <p className="font-medium">No trains found for this route</p>
          <p className="text-muted text-sm">Try different dates or a different class.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 anim-stagger">
          {results.map(result => (
            <TrainCard
              key={result.train.trainNumber}
              result={result}
              classCode={goal.classCode}
              onSelect={onSelect}
              language={language}
            />
          ))}
        </div>
      )}

      <div className="search-info-note inline-banner info">
        <span>ℹ</span>
        <span>
          {language === 'hi'
            ? 'AI एजेंट सीट मिलने तक आपकी कतार संभालेगा।'
            : 'Once you select a train, our AI agent will manage your queue position until a seat is found.'}
        </span>
      </div>
    </div>
  );
};

export default TrainResults;
