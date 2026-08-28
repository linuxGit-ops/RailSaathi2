/**
 * GoalInput.tsx — Natural Language Goal Entry (§14, §31 step 1)
 * "The user states an outcome; the agent manages search/queueing."
 */
import React, { useState } from 'react';
import { parseGoal, type TravelGoal } from '../../services/ai-agent';
import { useProfileStore } from '../../store/profile-store';
import { MockBadge } from '../layout/MockBadge';
import { useBookingStore } from '../../store/booking-store';

interface Props {
  bookingAttemptId: string;
  onGoalParsed: (goal: TravelGoal) => void;
}

const EXAMPLE_QUERIES = [
  'Howrah to Delhi, 27–30 Sept, 2A, 2 passengers',
  'Kolkata to New Delhi, 15 Oct, Sleeper',
  'HWH to NDLS, 5 Nov, 2A, 1 passenger',
];

const GoalInput: React.FC<Props> = ({ bookingAttemptId, onGoalParsed }) => {
  const { language } = useProfileStore();
  const { setLoading } = useBookingStore();

  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<TravelGoal | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseInput = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setLoading(true);
    try {
      const goal = await parseGoal(text, bookingAttemptId);
      setParsed(goal);
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await parseInput(input);
  };

  const handleExample = async (ex: string) => {
    setInput(ex);
    await parseInput(ex);
  };

  const confirmGoal = () => {
    if (parsed) onGoalParsed(parsed);
  };

  const editGoal = () => {
    setParsed(null);
  };

  return (
    <div className="step-container anim-fade-in-up">
      <div className="step-header">
        <h2 className="step-title">
          {language === 'hi' ? 'अपनी यात्रा बताएं' : 'Tell us your journey'}
        </h2>
        <p className="step-subtitle text-muted">
          {language === 'hi'
            ? 'आप कहाँ जाना चाहते हैं? बस बताएं।'
            : 'Describe your trip in plain language — we\'ll handle the rest.'}
        </p>
      </div>

      {!parsed ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="goal-input">
              {language === 'hi' ? 'यात्रा का लक्ष्य' : 'Travel goal'}
              <span style={{ marginLeft: 8 }}>
                <MockBadge label="AI parsing" />
              </span>
            </label>
            <textarea
              id="goal-input"
              className="form-input goal-textarea"
              placeholder={
                language === 'hi'
                  ? 'उदाहरण: हावड़ा से दिल्ली, 27–30 सितम्बर, 2A, 2 यात्री'
                  : 'e.g. Howrah to Delhi, 27–30 Sept, 2A, 2 passengers'
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={3}
              required
              aria-describedby="goal-examples"
            />
          </div>

          {/* Example queries */}
          <div id="goal-examples">
            <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
              {language === 'hi' ? 'उदाहरण:' : 'Try:'}
            </p>
            <div className="example-chips anim-stagger">
              {EXAMPLE_QUERIES.map(ex => (
                <button
                  key={ex}
                  type="button"
                  className="example-chip"
                  onClick={() => handleExample(ex)}
                  aria-label={`Use example: ${ex}`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-parse-goal"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="processing-dots">
                  <span/>
                  <span/>
                  <span/>
                </span>
                {language === 'hi' ? 'समझ रहे हैं…' : 'Understanding your goal…'}
              </>
            ) : (
              language === 'hi' ? 'आगे बढ़ें' : 'Find my train'
            )}
          </button>
        </form>
      ) : (
        /* Parsed goal confirmation */
        <div className="parsed-goal-card anim-scale-pop">
          <div className="parsed-goal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <span className="font-semibold">
                {language === 'hi' ? 'लक्ष्य समझा गया' : 'Goal understood'}
              </span>
              <span className={`badge badge-${parsed.confidence === 'HIGH' ? 'success' : parsed.confidence === 'MEDIUM' ? 'warning' : 'error'}`}>
                {parsed.confidence}
              </span>
            </div>
            <MockBadge label="AI parsed" />
          </div>

          <div className="parsed-goal-grid">
            <div className="goal-field">
              <span className="goal-field-label">{language === 'hi' ? 'कहाँ से' : 'From'}</span>
              <span className="goal-field-value">{parsed.fromName}</span>
            </div>
            <div className="goal-field">
              <span className="goal-field-label">{language === 'hi' ? 'कहाँ तक' : 'To'}</span>
              <span className="goal-field-value">{parsed.toName}</span>
            </div>
            <div className="goal-field">
              <span className="goal-field-label">{language === 'hi' ? 'दिनांक' : 'Dates'}</span>
              <span className="goal-field-value">{parsed.dateRange.slice(0, 3).join(', ')}{parsed.dateRange.length > 3 ? ` +${parsed.dateRange.length - 3} more` : ''}</span>
            </div>
            <div className="goal-field">
              <span className="goal-field-label">{language === 'hi' ? 'श्रेणी' : 'Class'}</span>
              <span className="goal-field-value">{parsed.classCode}</span>
            </div>
            <div className="goal-field">
              <span className="goal-field-label">{language === 'hi' ? 'यात्री' : 'Passengers'}</span>
              <span className="goal-field-value">{parsed.passengers}</span>
            </div>
            <div className="goal-field">
              <span className="goal-field-label">{language === 'hi' ? 'समूह नियम' : 'Group rule'}</span>
              <span className="goal-field-value" style={{ fontSize: 12 }}>{parsed.fulfillmentMode}</span>
            </div>
          </div>

          {parsed.warnings.length > 0 && (
            <div className="inline-banner warning" role="alert">
              <span>ℹ</span>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button id="btn-edit-goal" className="btn btn-ghost" style={{ flex: 1 }} onClick={editGoal}>
              {language === 'hi' ? 'बदलें' : 'Edit'}
            </button>
            <button id="btn-confirm-goal" className="btn btn-primary" style={{ flex: 2 }} onClick={confirmGoal}>
              {language === 'hi' ? 'ट्रेन खोजें' : 'Search trains →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalInput;
