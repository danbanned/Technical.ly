import { useEffect } from 'react';
import GlobeViewer from '../Globe/GlobeViewer';
import SiteHeader from '../Editorial/SiteHeader';
import RegionRail from '../Editorial/RegionRail';
import ArticleFeed from '../Editorial/ArticleFeed';
import BoardGameStats from '../Immersive/BoardGameStats';
import FakeCityGenerator from '../Immersive/FakeCityGenerator';
import LivingEcosystem from '../Immersive/LivingEcosystem';
import ImmersionAnnouncer from '../Editorial/ImmersionAnnouncer';
import CinematicTour from '../Immersive/CinematicTour';
import { useImmersionController } from '../../hooks/useImmersionController';

/**
 * EditorialLayout — the Living Article.
 *
 * Layer order (back to front):
 *   1. GlobeViewer        — fixed, full-viewport, drives ambient atmosphere
 *   2. Editorial shell    — header + scrollable article feed + region rail
 *   3. BoardGameStats     — appears only in Immersive mode
 *
 * The useImmersionController hook is mounted exactly once here so the
 * state machine has a single coordinator that owns camera flights and
 * shell-opacity transitions.
 */
export default function EditorialLayout() {
  const immersionAPI = useImmersionController();

  useEffect(() => {
    document.body.classList.add('editorial-mode');
    return () => document.body.classList.remove('editorial-mode');
  }, []);

  return (
    <>
      <div className="living-globe" aria-hidden="true">
        <GlobeViewer mode="background" />
      </div>

      <div className="editorial-shell">
        <SiteHeader onExitImmersive={immersionAPI.exitImmersive} />
        <ArticleFeed immersionAPI={immersionAPI} />
        <RegionRail />
      </div>

      <BoardGameStats />
      <FakeCityGenerator />
      <LivingEcosystem />
      <CinematicTour />
      <ImmersionAnnouncer />
    </>
  );
}
