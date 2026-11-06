import { Fragment } from 'react';

const STEPS = [
  { title: 'Enter your trip', subtitle: 'Origin, destination, cargo weight & schedule' },
  { title: 'Analyze weather conditions', subtitle: 'Hourly winds, rain, & snow at every checkpoint' },
  { title: 'Choose the safest option', subtitle: 'Review hazard scores & recommended corridor' },
];

export default function IntroHero() {
  return (
    <section className="intro-hero" aria-label="Overview">
      <div className="intro-hero-inner">
        <h1 className="intro-headline">Plan your route. Understand the weather. Travel safer.</h1>
        <p className="intro-lead">
          Enter your truck trip details. We analyze weather along available truck routes and help identify the safest eligible alternative.
        </p>

        <div className="intro-steps-strip">
          {STEPS.map((step, idx) => (
            <Fragment key={step.title}>
              {idx > 0 && <div className="step-arrow" aria-hidden="true">→</div>}
              <div className="step-card">
                <span className="step-number">{idx + 1}</span>
                <div className="step-text">
                  <span className="step-title">{step.title}</span>
                  <span className="step-subtitle">{step.subtitle}</span>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
