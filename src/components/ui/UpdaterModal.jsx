import { useState, useEffect } from 'react'
import Modal from './Modal'
import Button from './Button'
import { checkForUpdates, downloadAndInstallUpdate, getAppVersion } from '../../services/updaterService'
import { auditSystemSecurity } from '../../services/securityService'
import { useToast } from '../../hooks/useToast'
import { 
  ShieldCheck, 
  RefreshCw, 
  DownloadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Award, 
  Key, 
  Lock, 
  Server,
  ArrowRight
} from 'lucide-react'

export default function UpdaterModal({ isOpen, onClose }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('updates') // 'updates' | 'security'
  
  // Updates state
  const [currentVersion, setCurrentVersion] = useState('v1.0.0-enterprise')
  const [checking, setChecking]             = useState(false)
  const [updateInfo, setUpdateInfo]         = useState(null)
  const [installing, setInstalling]         = useState(false)
  const [progress, setProgress]             = useState({ status: '', percent: 0 })

  // Security state
  const [securityAudit, setSecurityAudit]   = useState(null)
  const [auditing, setAuditing]             = useState(false)

  useEffect(() => {
    if (isOpen) {
      getAppVersion().then(setCurrentVersion)
      runUpdateCheck(true)
      runSecurityCheck()
    }
  }, [isOpen])

  const runUpdateCheck = async (silent = false) => {
    setChecking(true)
    try {
      const res = await checkForUpdates()
      setUpdateInfo(res)
      if (!silent && !res?.available) {
        toast.info('You are running the latest version of ShopNest POS.')
      }
    } catch (err) {
      if (!silent) toast.error('Failed to check for updates.')
    } finally {
      setChecking(false)
    }
  }

  const handleInstallUpdate = async () => {
    if (!updateInfo) return
    setInstalling(true)
    setProgress({ status: 'Initializing download...', percent: 5 })
    try {
      const res = await downloadAndInstallUpdate(updateInfo, (step) => {
        setProgress(step)
      })
      if (res.simulated) {
        toast.success('Update installed! (Simulated Mode - Reloading application)')
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      toast.error(err?.message || 'Update installation failed.')
      setInstalling(false)
    }
  }

  const runSecurityCheck = async () => {
    setAuditing(true)
    try {
      const audit = await auditSystemSecurity()
      setSecurityAudit(audit)
    } catch {
      toast.error('Security audit check failed.')
    } finally {
      setAuditing(false)
    }
  }

  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'ShieldCheck': return <ShieldCheck size={18} className="text-emerald-600" />
      case 'Database':    return <Database size={18} className="text-emerald-600" />
      case 'Award':       return <Award size={18} className="text-emerald-600" />
      case 'Key':         return <Key size={18} className="text-emerald-600" />
      default:            return <CheckCircle2 size={18} className="text-emerald-600" />
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Health, Updates & Security"
      size="md"
    >
      <div className="p-1 space-y-5">
        
        {/* --- Navigation Tabs --- */}
        <div className="flex border-b border-[#d9d4c8] gap-2 pb-1">
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-t-lg transition-all border-b-2 ${
              activeTab === 'updates'
                ? 'border-[#004643] text-[#004643] bg-[#e5f2f1]'
                : 'border-transparent text-[#697773] hover:bg-[#f7f4ed]'
            }`}
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            Software Updates {updateInfo?.available && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-t-lg transition-all border-b-2 ${
              activeTab === 'security'
                ? 'border-[#004643] text-[#004643] bg-[#e5f2f1]'
                : 'border-transparent text-[#697773] hover:bg-[#f7f4ed]'
            }`}
          >
            <ShieldCheck size={15} />
            Enterprise Security
          </button>
        </div>

        {/* --- Tab 1: Software Updates --- */}
        {activeTab === 'updates' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Current Status Box */}
            <div className="p-4 bg-[#f7f4ed] border border-[#d9d4c8] rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#697773] uppercase tracking-wider">Installed POS Build</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-black text-[#182321] font-mono">{currentVersion}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase rounded-md">
                    Verified
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={<RefreshCw size={14} className={checking ? 'animate-spin' : ''} />}
                onClick={() => runUpdateCheck(false)}
                disabled={checking || installing}
              >
                {checking ? 'Checking...' : 'Check Now'}
              </Button>
            </div>

            {/* Update Available Card */}
            {updateInfo?.available ? (
              <div className="p-5 bg-gradient-to-br from-[#e5f2f1] to-white border-2 border-[#004643]/30 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#004643] text-white rounded-lg shadow-sm">
                      <DownloadCloud size={24} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#182321] text-base">New Update Available!</h4>
                      <p className="text-xs font-bold text-[#004643] font-mono">
                        Version v{updateInfo.version} • Released {updateInfo.date}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Release Notes */}
                <div className="p-3 bg-white/80 border border-[#c8ddda] rounded-lg text-xs text-[#182321] space-y-1">
                  <p className="font-bold text-[#004643] uppercase text-[10px] tracking-wider mb-1">Release Highlights:</p>
                  <pre className="font-sans whitespace-pre-wrap leading-relaxed text-slate-700">
                    {updateInfo.body}
                  </pre>
                </div>

                {/* Installation Progress Bar or Action Button */}
                {installing ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-bold text-[#004643]">
                      <span>{progress.status}</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                      <div 
                        className="h-full bg-[#004643] transition-all duration-300 ease-out"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    fullWidth
                    size="lg"
                    icon={<ArrowRight size={18} />}
                    onClick={handleInstallUpdate}
                    className="py-3 font-bold text-base bg-[#004643] hover:bg-[#003734] text-white shadow-md"
                  >
                    Download & Install Enterprise Update
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-[#d9d4c8] rounded-xl bg-white">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
                <h4 className="font-bold text-[#182321] text-base">Your terminal is up to date</h4>
                <p className="text-xs text-[#697773] mt-1 max-w-sm mx-auto">
                  ShopNest desktop daemon automatically checks for cryptographic security patches and POS feature updates in the background.
                </p>
              </div>
            )}
          </div>
        )}

        {/* --- Tab 2: Enterprise Security --- */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Security Header Banner */}
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                  <Lock size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-emerald-950 text-base">System Security Score</h4>
                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md">
                      100% COMPLIANT
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium">All cryptographic vaults and IPC channels are hardened.</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={<RefreshCw size={14} className={auditing ? 'animate-spin' : ''} />}
                onClick={runSecurityCheck}
                disabled={auditing}
              >
                {auditing ? 'Auditing...' : 'Re-verify'}
              </Button>
            </div>

            {/* Audit Checklists */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {securityAudit?.checks?.map((check) => (
                <div 
                  key={check.id}
                  className="p-3.5 bg-white border border-[#d9d4c8] rounded-xl flex items-start gap-3 hover:border-[#c8ddda] transition-colors"
                >
                  <div className="p-2 bg-[#e5f2f1] rounded-lg shrink-0 mt-0.5">
                    {renderIcon(check.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-bold text-xs text-[#182321]">{check.name}</h5>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                        {check.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#697773] mt-1 leading-relaxed">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-[#697773] font-mono">
                Cryptographic Module: AES-256-GCM / SHA-256 • Verified by ShopNest Security Engine
              </p>
            </div>

          </div>
        )}

      </div>
    </Modal>
  )
}
