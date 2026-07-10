using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace FloxyncBridgeManager
{
    public class MainForm : Form
    {
        private Label lblStatusPP;
        private Label lblStatusRibbon;
        private Button btnTogglePP;
        private Button btnToggleRibbon;
        private Button btnStartup;
        private Timer timer;

        private static readonly string PP_DAEMON_PATH = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "FloxyncBridge", "floxync-daemon.exe"
        );
        private static readonly string PP_VBS_PATH = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "FloxyncBridge", "ppbridge.vbs"
        );
        private static readonly string RIBBON_BRIDGE_PATH = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "RibbonBridge", "launch_service.exe"
        );

        public MainForm()
        {
            this.Text = "Floxync 프린터 매니저";
            this.Size = new Size(320, 240);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = SystemIcons.Application;

            Label lblTitle = new Label() { Text = "Floxync 프린터 연결 컨트롤 박스", Location = new Point(10, 15), AutoSize = true, Font = new Font("Malgun Gothic", 10, FontStyle.Bold) };
            this.Controls.Add(lblTitle);

            // PP Bridge
            Label lblPP = new Label() { Text = "PP 영수증 브릿지:", Location = new Point(15, 55), AutoSize = true };
            lblStatusPP = new Label() { Text = "확인중...", Location = new Point(125, 55), AutoSize = true, ForeColor = Color.Gray, Font = new Font("Malgun Gothic", 9, FontStyle.Bold) };
            btnTogglePP = new Button() { Text = "시작", Location = new Point(210, 50), Size = new Size(70, 25) };
            btnTogglePP.Click += BtnTogglePP_Click;
            this.Controls.Add(lblPP);
            this.Controls.Add(lblStatusPP);
            this.Controls.Add(btnTogglePP);

            // Ribbon Bridge
            Label lblRibbon = new Label() { Text = "리본 프린터 브릿지:", Location = new Point(15, 95), AutoSize = true };
            lblStatusRibbon = new Label() { Text = "확인중...", Location = new Point(125, 95), AutoSize = true, ForeColor = Color.Gray, Font = new Font("Malgun Gothic", 9, FontStyle.Bold) };
            btnToggleRibbon = new Button() { Text = "시작", Location = new Point(210, 90), Size = new Size(70, 25) };
            btnToggleRibbon.Click += BtnToggleRibbon_Click;
            this.Controls.Add(lblRibbon);
            this.Controls.Add(lblStatusRibbon);
            this.Controls.Add(btnToggleRibbon);

            // Startup Button
            btnStartup = new Button() { Text = "시작 프로그램에 등록 (윈도우 부팅시 자동실행)", Location = new Point(15, 140), Size = new Size(265, 30) };
            btnStartup.Click += BtnStartup_Click;
            this.Controls.Add(btnStartup);

            Label lblInfo = new Label() { Text = "※ 창을 닫아도 연결은 유지됩니다. 끄려면 '종료'를 누르세요.", Location = new Point(15, 180), AutoSize = true, ForeColor = Color.DarkGray, Font = new Font("Malgun Gothic", 8) };
            this.Controls.Add(lblInfo);

            timer = new Timer();
            timer.Interval = 2000;
            timer.Tick += Timer_Tick;
            timer.Start();

            UpdateStatus();
        }

        private bool IsProcessRunning(string processName)
        {
            return Process.GetProcessesByName(processName).Length > 0;
        }

        private void UpdateStatus()
        {
            bool isPPRunning = IsProcessRunning("floxync-daemon") || IsProcessRunning("Floxync-Print-Bridge");
            bool isRibbonRunning = IsProcessRunning("launch_service") || IsProcessRunning("RibbonBridge_Core") || IsProcessRunning("RibbonBridge");

            if (isPPRunning)
            {
                lblStatusPP.Text = "🟢 실행중";
                lblStatusPP.ForeColor = Color.Green;
                btnTogglePP.Text = "종료";
            }
            else
            {
                lblStatusPP.Text = "🔴 중지됨";
                lblStatusPP.ForeColor = Color.Red;
                btnTogglePP.Text = "시작";
            }

            if (isRibbonRunning)
            {
                lblStatusRibbon.Text = "🟢 실행중";
                lblStatusRibbon.ForeColor = Color.Green;
                btnToggleRibbon.Text = "종료";
            }
            else
            {
                lblStatusRibbon.Text = "🔴 중지됨";
                lblStatusRibbon.ForeColor = Color.Red;
                btnToggleRibbon.Text = "시작";
            }
        }

        private void Timer_Tick(object sender, EventArgs e) { UpdateStatus(); }

        private void KillProcesses(string name)
        {
            foreach (var process in Process.GetProcessesByName(name))
                try { process.Kill(); } catch { }
        }

        private void StartHidden(string exePath)
        {
            if (!File.Exists(exePath)) return;
            ProcessStartInfo psi = new ProcessStartInfo(exePath);
            psi.WorkingDirectory = Path.GetDirectoryName(exePath);
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;
            Process.Start(psi);
        }

        private void BtnTogglePP_Click(object sender, EventArgs e)
        {
            if (IsProcessRunning("floxync-daemon") || IsProcessRunning("Floxync-Print-Bridge"))
            {
                KillProcesses("floxync-daemon");
                KillProcesses("Floxync-Print-Bridge");
            }
            else
            {
                if (File.Exists(PP_DAEMON_PATH))
                {
                    StartHidden(PP_DAEMON_PATH);
                }
                else
                {
                    MessageBox.Show("PP 브릿지가 설치되어 있지 않습니다.\n\nFloxync 웹앱 → 환경설정에서 컨트롤러 설치파일을 다시 받아 설치해 주세요.", "미설치", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            System.Threading.Thread.Sleep(500);
            UpdateStatus();
        }

        private void BtnToggleRibbon_Click(object sender, EventArgs e)
        {
            if (IsProcessRunning("launch_service") || IsProcessRunning("RibbonBridge_Core") || IsProcessRunning("RibbonBridge"))
            {
                KillProcesses("launch_service");
                KillProcesses("RibbonBridge_Core");
                KillProcesses("RibbonBridge");
            }
            else
            {
                if (File.Exists(RIBBON_BRIDGE_PATH))
                {
                    StartHidden(RIBBON_BRIDGE_PATH);
                }
                else
                {
                    MessageBox.Show("리본 브릿지가 설치되어 있지 않습니다.\n\nFloxync 웹앱 → 환경설정에서 컨트롤러 설치파일을 다시 받아 설치해 주세요.", "미설치", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            System.Threading.Thread.Sleep(500);
            UpdateStatus();
        }

        private void BtnStartup_Click(object sender, EventArgs e)
        {
            try
            {
                string startupFolder = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                string shortcutPath = Path.Combine(startupFolder, "FloxyncBridgeManager.url");
                using (StreamWriter writer = new StreamWriter(shortcutPath))
                {
                    writer.WriteLine("[InternetShortcut]");
                    writer.WriteLine("URL=file:///" + Application.ExecutablePath.Replace('\\', '/'));
                    writer.WriteLine("IconIndex=0");
                    writer.WriteLine("IconFile=" + Application.ExecutablePath.Replace('\\', '/'));
                }
                MessageBox.Show("시작 프로그램에 등록되었습니다.\n이제 윈도우가 켜질 때 이 컨트롤 박스가 자동으로 실행됩니다.", "등록 완료", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("시작 프로그램 등록 중 오류가 발생했습니다.\n" + ex.Message, "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
