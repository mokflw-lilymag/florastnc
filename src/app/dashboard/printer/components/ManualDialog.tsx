import { X, BookOpen, Settings, PenTool } from 'lucide-react';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

export function ManualDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
      <div className="bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-600 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-blue-400 w-6 h-6" />
            {R.manualTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto space-y-8 text-sm md:text-base text-slate-300">
          <section className="bg-slate-900/50 p-6 rounded-xl border-t-4 border-slate-700 hover:border-blue-500 transition-colors">
            <h3 className="text-xl font-bold text-blue-400 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
              {R.manualS1Title}
            </h3>
            <div className="space-y-3 text-slate-300 ml-9">
              <p>
                {R.manualS1IntroBefore}
                <strong>{R.manualS1IntroStrong}</strong>
                {R.manualS1IntroAfter}
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 text-sm leading-relaxed text-slate-400 mt-2">
                <li>
                  <strong className="text-slate-200">{R.manualS1Li1Label}</strong> {R.manualS1Li1Mid1}
                  <strong>[{R.manualS1Li1Preset}]</strong>
                  {R.manualS1Li1Mid2}
                </li>
                <li>
                  <strong className="text-amber-400">{R.manualS1Li2Label}</strong> {R.manualS1Li2Mid1}
                  <strong>{R.manualS1Li2Roll}</strong>
                  {R.manualS1Li2Mid2}
                  <strong>{R.manualS1Li2Cut}</strong>
                  {R.manualS1Li2Mid3}
                </li>
                <li>
                  <strong className="text-slate-200">{R.manualS1Li3Label}</strong> {R.manualS1Li3Body}
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 p-6 rounded-xl border-t-4 border-slate-700 hover:border-emerald-500 transition-colors">
            <h3 className="text-xl font-bold text-emerald-400 mb-3 flex items-center gap-2">
              <span className="bg-emerald-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
              {R.manualS2Title}
            </h3>
            <div className="space-y-3 text-slate-300 ml-9">
              <p>{R.manualS2Intro}</p>
              <ul className="list-disc list-outside ml-5 space-y-2 text-sm leading-relaxed text-slate-400 mt-2">
                <li>
                  <strong className="text-slate-200">{R.manualS2Li1Label}</strong> {R.manualS2Li1Mid1}
                  <strong>{R.manualS2Li1Left}</strong>
                  {R.manualS2Li1Mid2}
                  <strong>{R.manualS2Li1Right}</strong>
                  {R.manualS2Li1Mid3}
                </li>
                <li>
                  <strong className="text-blue-300">{R.manualS2Li2Label}</strong> {R.manualS2Li2Mid1}
                  <strong>{R.manualS2Li2Bank}</strong>
                  {R.manualS2Li2Mid2}
                </li>
                <li>
                  <strong className="text-slate-200 flex items-center gap-1 mt-1">
                    <PenTool className="w-4 h-4 text-emerald-400" /> {R.manualS2Li3Label}
                  </strong>{' '}
                  {R.manualS2Li3Body}
                </li>
                <li>
                  {R.manualS2Li4BeforeIcon}
                  <Settings className="w-3 h-3 inline" /> {R.manualS2Li4AfterIcon}
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 p-6 rounded-xl border-t-4 border-slate-700 hover:border-amber-500 transition-colors">
            <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
              <span className="bg-amber-500 text-slate-900 rounded-full w-7 h-7 flex items-center justify-center text-sm">3</span>
              {R.manualS3Title}
            </h3>
            <div className="space-y-3 text-slate-300 ml-9">
              <p>{R.manualS3Intro}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-800 p-5 rounded-lg border border-slate-600 shadow-md">
                  <h4 className="text-white text-base font-bold mb-2 flex items-center gap-2">
                    <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 text-sm">[ ]</span> {R.manualS3R1Title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{R.manualS3R1Desc}</p>
                  <div className="bg-slate-900 p-2 rounded text-sm font-mono text-emerald-300 border border-slate-700/50">
                    {R.manualS3R1InputLbl} <span className="text-white">{R.manualS3R1Sample}</span>
                    <br />
                    {R.manualS3R1Effect}
                  </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-lg border border-slate-600 shadow-md">
                  <h4 className="text-white text-base font-bold mb-2 flex items-center gap-2">
                    <span className="bg-slate-700 px-2 py-0.5 rounded text-amber-400 text-sm">[ / ]</span> {R.manualS3R2Title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{R.manualS3R2Desc}</p>
                  <div className="bg-slate-900 p-2 rounded text-sm font-mono text-emerald-300 border border-slate-700/50">
                    {R.manualS3R2InputLbl} <span className="text-white">{R.manualS3R2Sample}</span>
                    <br />
                    {R.manualS3R2Effect}
                  </div>
                </div>

                <div className="bg-slate-800 p-5 rounded-lg border border-slate-600 shadow-md">
                  <h4 className="text-white text-base font-bold mb-2">{R.manualS3R3Title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {R.manualS3R3DescBefore}
                    <strong>{R.manualS3R3ClickStrong}</strong>
                    {R.manualS3R3DescAfter}
                  </p>
                </div>

                <div className="bg-slate-800 p-5 rounded-lg border border-slate-600 shadow-md">
                  <h4 className="text-white text-base font-bold mb-2">{R.manualS3R4Title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {R.manualS3R4DescBefore}
                    <code>{R.manualS3R4Code}</code>
                    {R.manualS3R4DescAfter}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/50 p-6 rounded-xl border-t-4 border-slate-700 hover:border-indigo-500 transition-colors">
            <h3 className="text-xl font-bold text-indigo-400 mb-3 flex items-center gap-2">
              <span className="bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">4</span>
              {R.manualS4Title}
            </h3>
            <div className="space-y-3 text-slate-300 ml-9">
              <ul className="list-disc list-outside ml-5 space-y-3 text-sm leading-relaxed text-slate-400">
                <li>
                  <strong className="text-white">{R.manualS4Li1Label}</strong> {R.manualS4Li1Body}
                </li>
                <li>
                  <strong className="text-blue-400">{R.manualS4Li2Label}</strong> {R.manualS4Li2Body}
                </li>
                <li>
                  <strong className="text-red-400">{R.manualS4Li3Label}</strong> {R.manualS4Li3BeforeU}
                  <span className="underline">{R.manualS4Li3Underlined}</span>
                  {R.manualS4Li3AfterU}
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
              <span role="img" aria-label="headset">
                🎧
              </span>{' '}
              {R.manualS5Title}
            </h3>
            <div className="space-y-4 text-slate-300">
              <p>{R.manualS5Intro}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-between border border-blue-500/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-900/50 p-2 rounded-full text-2xl">📞</div>
                    <div>
                      <h4 className="font-semibold text-white">{R.manualS5PhoneTitle}</h4>
                      <p className="text-sm text-slate-400">{R.manualS5PhoneHours}</p>
                    </div>
                  </div>
                  <div className="text-blue-400 font-extrabold text-xl font-mono">1588-0000</div>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-between border border-amber-500/30 hover:bg-slate-700/80 cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-900/50 p-2 rounded-full text-2xl">💬</div>
                    <div>
                      <h4 className="font-semibold text-white">{R.manualS5KakaoTitle}</h4>
                      <p className="text-sm text-slate-400">{R.manualS5KakaoHours}</p>
                    </div>
                  </div>
                  <div className="text-amber-400 font-bold">@ribbonprint</div>
                </div>
              </div>

              <div className="text-sm mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <p>{R.manualS5BugNote}</p>
              </div>
            </div>
          </section>

          <section className="bg-red-500/5 p-6 rounded-xl border-t-4 border-red-500/30 hover:border-red-500 transition-colors shadow-lg">
            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <span className="bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">6</span>
              {R.manualS6Title}
            </h3>
            <div className="space-y-4 ml-9">
              <p className="text-slate-200">{R.manualS6Intro}</p>

              <div className="space-y-4 mt-4">
                <div className="flex gap-3 text-left">
                  <div className="shrink-0 w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-white mt-1">1</div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{R.manualS6T1Title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {R.manualS6T1BeforeBtn}
                      <span className="text-blue-400 font-bold">{R.manualS6T1Btn}</span>
                      {R.manualS6T1AfterBtn}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 text-left">
                  <div className="shrink-0 w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-white mt-1">2</div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{R.manualS6T2Title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {R.manualS6T2P1} <br />
                      <span className="text-amber-400 font-bold">{R.manualS6T2TaskMgr}</span>
                      {R.manualS6T2P2}
                      <span className="underline">{R.manualS6T2EndTask}</span>
                      {R.manualS6T2P3}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <code className="bg-slate-900 px-2 py-1 rounded text-red-300 border border-slate-700 text-xs font-mono">launch_service.exe</code>
                      <code className="bg-slate-900 px-2 py-1 rounded text-red-300 border border-slate-700 text-xs font-mono">RibbonBridge_Core.exe</code>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 text-left">
                  <div className="shrink-0 w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-white mt-1">3</div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{R.manualS6T3Title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {R.manualS6T3Before}
                      <span className="text-emerald-400 font-bold">{R.manualS6T3Em}</span>
                      {R.manualS6T3After}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
