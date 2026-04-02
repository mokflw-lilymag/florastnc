using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Threading;

namespace RibbonBridgeInstaller
{
    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblDetail;
        private Label lblTitle;
        private Button btnClose;
        private Panel headerPanel;
        
        public InstallerForm()
        {
            this.Text = "리본 브릿지(RibbonBridge) 프리미엄 설치 가이드 v25.0";
            this.Size = new Size(500, 320);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.MaximizeBox = false;
            this.BackColor = Color.White;

            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 70;
            headerPanel.BackColor = Color.FromArgb(240, 240, 240);
            this.Controls.Add(headerPanel);

            lblTitle = new Label();
            lblTitle.Text = "🎀 RibbonBridge v25.0 Setup";
            lblTitle.Font = new Font("Malgun Gothic", 14, FontStyle.Bold);
            lblTitle.Location = new Point(20, 20);
            lblTitle.AutoSize = true;
            headerPanel.Controls.Add(lblTitle);

            lblStatus = new Label();
            lblStatus.Text = "준비 중...";
            lblStatus.Font = new Font("Malgun Gothic", 10, FontStyle.Bold);
            lblStatus.Location = new Point(30, 90);
            lblStatus.Size = new Size(440, 25);
            this.Controls.Add(lblStatus);

            lblDetail = new Label();
            lblDetail.Text = "설치를 시작하기 위해 대기 중입니다.";
            lblDetail.Font = new Font("Malgun Gothic", 9);
            lblDetail.Location = new Point(30, 115);
            lblDetail.Size = new Size(440, 40);
            lblDetail.ForeColor = Color.Gray;
            this.Controls.Add(lblDetail);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(30, 165);
            progressBar.Size = new Size(430, 25);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            btnClose = new Button();
            btnClose.Text = "닫기";
            btnClose.Size = new Size(100, 35);
            btnClose.Location = new Point(360, 230);
            btnClose.Enabled = false;
            btnClose.Click += (s, e) => this.Close();
            this.Controls.Add(btnClose);

            this.Load += (s, e) => StartInstallation();
        }

        private void UpdateUI(string status, string detail, int progress)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => UpdateUI(status, detail, progress)));
                return;
            }
            if (status != null) lblStatus.Text = status;
            if (detail != null) lblDetail.Text = detail;
            if (progress >= 0) progressBar.Value = progress;
        }

        private void StartInstallation()
        {
            Thread thread = new Thread(InstallWorker);
            thread.IsBackground = true;
            thread.Start();
        }

        private void InstallWorker()
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string installDir = Path.Combine(localAppData, "RibbonBridge");
            string zipPath = Path.Combine(localAppData, "RibbonBridge_Bundle.zip");

            try
            {
                UpdateUI("레거시 프로세스 제거 중", "구버전 브릿지(8000, 8002)를 찾아 안전하게 종료하고 있습니다...", 10);
                
                string[] targetProcs = { "RibbonBridge_Core", "RibbonBridge_Core_8002", "ribbon_printer", "launch_service", "node", "RibbonBridge", "RibbonBridge_Server" };
                foreach (string procName in targetProcs) {
                    try {
                        ProcessStartInfo killInfo = new ProcessStartInfo("taskkill", string.Format("/F /IM {0}.exe /T", procName));
                        killInfo.WindowStyle = ProcessWindowStyle.Hidden;
                        killInfo.CreateNoWindow = true;
                        var p = Process.Start(killInfo);
                        if (p != null) p.WaitForExit(2000);
                    } catch { }
                }

                UpdateUI("포트 점유 해제 중", "현재 사용 중인 인쇄 포트를 강제로 해제하고 있습니다...", 20);
                int[] targetPorts = { 8000, 8002 };
                foreach (int port in targetPorts) {
                    try {
                        Process netstat = new Process();
                        netstat.StartInfo.FileName = "cmd.exe";
                        netstat.StartInfo.Arguments = string.Format("/c netstat -ano | findstr :{0}", port);
                        netstat.StartInfo.UseShellExecute = false;
                        netstat.StartInfo.RedirectStandardOutput = true;
                        netstat.StartInfo.CreateNoWindow = true;
                        netstat.Start();
                        string netstatOut = netstat.StandardOutput.ReadToEnd();
                        netstat.WaitForExit();
                        
                        foreach (string line in netstatOut.Split('\n')) {
                            if (line.Contains("LISTENING")) {
                                string[] parts = line.Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                                if (parts.Length > 0) {
                                    string pid = parts[parts.Length - 1].Trim();
                                    if (!string.IsNullOrEmpty(pid) && pid != "0") {
                                        ProcessStartInfo pidKill = new ProcessStartInfo("taskkill", string.Format("/F /PID {0} /T", pid));
                                        pidKill.WindowStyle = ProcessWindowStyle.Hidden;
                                        pidKill.CreateNoWindow = true;
                                        var pk = Process.Start(pidKill);
                                        if (pk != null) pk.WaitForExit(1000);
                                    }
                                }
                            }
                        }
                    } catch { }
                }

                UpdateUI("기존 파일 정리 중", "사용자 데이터를 보호하며 낡은 파일을 제거하고 있습니다...", 40);
                if (Directory.Exists(installDir)) {
                    for (int retry = 0; retry < 5; retry++) {
                        try {
                            Directory.Delete(installDir, true);
                            break;
                        } catch {
                            Thread.Sleep(500);
                        }
                    }
                }
                Directory.CreateDirectory(installDir);

                UpdateUI("패키지 데이터 추출 중", "신규 엔진 v25.0 구성 요소를 준비하고 있습니다...", 60);
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("RibbonBridgePackage.zip"))
                {
                    if (stream == null) throw new Exception("설치 패키지(ZIP) 손상되었습니다. 다시 다운로드해주세요.");
                    using (FileStream fileStream = new FileStream(zipPath, FileMode.Create))
                    {
                        byte[] buffer = new byte[8192];
                        int read;
                        while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                        {
                            fileStream.Write(buffer, 0, read);
                        }
                    }
                }

                UpdateUI("압축 해제 및 파일 복사 중", "리본 프린터 전용 드라이버 및 엔진을 설치 중입니다...", 80);
                if (File.Exists(zipPath))
                {
                    using (ZipArchive archive = ZipFile.OpenRead(zipPath))
                    {
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            string relativePath = entry.FullName;
                            int firstSlash = relativePath.IndexOf('/');
                            if (firstSlash > 0) relativePath = relativePath.Substring(firstSlash + 1);
                            if (string.IsNullOrEmpty(relativePath)) continue;

                            string fullPath = Path.Combine(installDir, relativePath);
                            UpdateUI(null, string.Format("복사 중: {0}", relativePath), -1);
                            
                            if (entry.FullName.EndsWith("/")) {
                                Directory.CreateDirectory(fullPath);
                            } else {
                                Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
                                entry.ExtractToFile(fullPath, true);
                            }
                        }
                    }
                    File.Delete(zipPath);
                }

                UpdateUI("시스템 환경 설정 중", "윈도우 시작 시 자동 실행되도록 등록하고 있습니다...", 90);
                string launcherPath = Path.Combine(installDir, "launch_service.exe");
                string runKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(runKey, true))
                {
                    key.SetValue("RibbonBridgeService", "\"" + launcherPath + "\"");
                }

                UpdateUI("설치 완료!", "모든 과정이 성공적으로 끝났습니다. 이제 즉각 사용 가능합니다.", 100);
                if (File.Exists(launcherPath))
                {
                    Process.Start(new ProcessStartInfo(launcherPath) { WorkingDirectory = Path.GetDirectoryName(launcherPath) });
                }

                this.Invoke(new Action(() => {
                    btnClose.Enabled = true;
                    btnClose.Text = "완료";
                    lblTitle.ForeColor = Color.Green;
                }));
                
                MessageBox.Show("🎉 리본 브릿지 v25.0 설치가 완료되었습니다!", "알림", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                UpdateUI("설치 실패", "오류가 발생했습니다: " + ex.Message, 0);
                this.Invoke(new Action(() => {
                    btnClose.Enabled = true;
                    lblTitle.ForeColor = Color.Red;
                }));
                MessageBox.Show("설치 중 치명적인 오류가 발생했습니다.\n\n" + ex.Message, "설치 오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            DialogResult result = MessageBox.Show(
                "🎀 리본 브릿지(RibbonBridge) v25.0 프리미엄 설치를 시작합니다.\n\n[업데이트 내용]\n- 8002 신규 포트 마이그레이션\n- 고성능 PNA 엔진 탑재\n- 기존 구버전 자동 정리\n\n지금 설치하시겠습니까?", 
                "RibbonBridge Universal Setup", 
                MessageBoxButtons.YesNo, 
                MessageBoxIcon.Information);

            if (result == DialogResult.Yes)
            {
                Application.Run(new InstallerForm());
            }
        }
    }
}
