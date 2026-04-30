import { CallUI } from '../../components/CallUI';

export const metadata = {
  title: 'Saarthi - Web IVR Call',
  description: 'AgriSaarthi AI Voice Assistant',
};

export default function IVRCallPage() {
  return (
    <main className="w-full h-full min-h-screen bg-[#0f2d1f]">
      <CallUI />
    </main>
  );
}
