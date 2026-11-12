# Importing your own PDFs (V41)
Open a campaign, choose Player's Handbook, Monster Manual or Dungeon Master's Guide in the sidebar, and click **Import / Replace PDF**.
Choose a local PDF. The app copies it into `%APPDATA%/grims-dm-command-center/imported-books/` so updates and reinstallations normally preserve it.
Click **Open separately** to open the imported PDF in its own Electron window.
Do not upload copyrighted PDFs to the public repository.
To update the existing GitHub project, replace the files within `Grims_DM_Windows_App_V40` with the contents of this folder (do not upload the containing V41 folder).
Then run the existing GitHub Actions workflow to build an installer.
