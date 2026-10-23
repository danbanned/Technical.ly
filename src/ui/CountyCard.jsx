import CollapsibleCard from './CollapsibleCard';
import { TRACTS, TRACTS_LAST_UPDATED, fmt } from '../data/places';

// "Philadelphia County" card. The app has no county-level figures, so this lists
// the tracts in its bundled sample data, labeled as sample. No live Census fetch.
export default function CountyCard({ headingLevel = 2 }) {
  const H = `h${headingLevel}`;
  return (
    <section className="bv-card" aria-labelledby="county-heading">
      <div className="bv-card-head">
        <H id="county-heading">Philadelphia County</H>
        <span className="bv-tag bv-tag-sample">Sample data · not ACS</span>
      </div>
      <p className="bv-hint">
        No county-level figures exist in the app&apos;s data. These are the {TRACTS.length} tracts bundled
        with the app (of 408 in the county); every value is sample data.
      </p>
      <div className="bv-table-wrap">
        <table className="bv-table">
          <caption className="bv-sr-only">Sample values for the tracts bundled with the app</caption>
          <thead>
            <tr>
              <th scope="col">Tract</th>
              <th scope="col">Neighborhood</th>
              <th scope="col" className="num">Median income</th>
              <th scope="col" className="num">Unemployment</th>
              <th scope="col" className="num">Mobility (0–100)</th>
            </tr>
          </thead>
          <tbody>
            {TRACTS.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.neighborhood}</td>
                <td className="num">{fmt.usd(t.medianIncome)}</td>
                <td className="num">{fmt.pctFromFraction(t.unemploymentRate)}</td>
                <td className="num">{fmt.num(t.mobilityScore, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CollapsibleCard title="Source and methodology">
        <p>
          Values are hand-entered sample data in <code>src/data/philadelphiaTracts.js</code> (each tract
          flagged <code>synthetic: true</code>, file dated {TRACTS_LAST_UPDATED}). They are not Census ACS
          estimates. The app makes no Census request.
        </p>
      </CollapsibleCard>
    </section>
  );
}
