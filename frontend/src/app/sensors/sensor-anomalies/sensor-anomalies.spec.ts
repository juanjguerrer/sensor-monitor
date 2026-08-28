import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { SensorAnomalies } from './sensor-anomalies';

describe('SensorAnomalies', () => {
  let fixture: ComponentFixture<SensorAnomalies>;
  let controller: ApolloTestingController;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const find = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorAnomalies, ApolloTestingModule],
    }).compileComponents();

    controller = TestBed.inject(ApolloTestingController);
    fixture = TestBed.createComponent(SensorAnomalies);
    fixture.componentRef.setInput('id', 1);
    fixture.componentRef.setInput('unit', '°C');
    await fixture.whenStable();
  });

  afterEach(() => {
    controller.verify();
  });

  it('shows skeletons until the query answers', () => {
    expect(find('.anomaly--skeleton')).not.toBeNull();

    controller.expectOne('GetAnomalies');
  });

  it('lists the anomalies it receives', async () => {
    controller.expectOne('GetAnomalies').flushData({
      anomalies: [
        {
          __typename: 'Anomaly',
          readingId: 10,
          timestamp: '2026-08-27T10:00:00.000Z',
          value: 118.2,
          deviation: 68.2,
          zScore: 3.4,
        },
      ],
    });
    await fixture.whenStable();

    expect(find('.anomaly__value')?.textContent).toContain('118.2');
    expect(text()).toContain('3.4');
    expect(find('.anomalies__count')?.textContent?.trim()).toBe('1');
  });

  it('reports an empty result as reassurance, not absence', async () => {
    controller.expectOne('GetAnomalies').flushData({ anomalies: [] });
    await fixture.whenStable();

    expect(text()).toContain('Nothing unusual');
    expect(find('[role="alert"]')).toBeNull();
  });

  // The backend rejects this query outright when there is too little history for
  // the threshold to be reachable. That is a routine state for a new sensor, so
  // it must not surface as a failure — even though `error()` is truthy here too.
  it('treats too little history as informational, not an error', async () => {
    controller.expectOne('GetAnomalies').graphqlErrors([
      {
        message: 'Not enough readings to detect anomalies with the given threshold.',
        extensions: { code: 'BAD_USER_INPUT', maxZScore: 2.1 },
      },
    ]);
    await fixture.whenStable();

    expect(text()).toContain('Not enough readings yet');
    // The assertion that matters: swap the template's branch order and this fails.
    expect(find('[role="alert"]')).toBeNull();
  });

  it('shows the error panel for any other failure', async () => {
    controller.expectOne('GetAnomalies').graphqlErrors([
      { message: 'boom', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
    ]);
    await fixture.whenStable();

    expect(find('[role="alert"]')).not.toBeNull();
    expect(text()).toContain("Couldn't check for anomalies");
    expect(text()).not.toContain('Not enough readings yet');
  });
});
