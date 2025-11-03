Skip to content
Navigation Menu
kashyoTecnico
loader1

Type / to search
Code
Issues
Pull requests
Actions
Projects
Wiki
Security
1
Insights
Settings
Commit 1a76cc9
kashyoTecnico
kashyoTecnico
authored
3 weeks ago
·
·
Verified
Update server.js
main
1 parent 
0e511e6
 commit 
1a76cc9
File tree
Filter files…
server.js
1 file changed
+22
-1
lines changed
Search within code
 
‎server.js‎
+22
-1
Lines changed: 22 additions & 1 deletion
Original file line number	Diff line number	Diff line change
@@ -117,4 +117,25 @@ app.get("/stream", async (req, res) => {
    res.setHeader("Content-Type", "audio/mpeg");
    // Opcional: permitir descarga directo
    if (req.query.download === "1") {
      res.setHeader("Content-Disposition", `attachment; fi
      res.setHeader("Content-Disposition", `attachment; filename="${info.title.replace(/[^a-z0-9\-_.]/gi,'_')}.mp3"`);
    }
    // Pipe body al cliente
    upstream.body.pipe(res);
    upstream.body.on("error", err => {
      console.error("Stream upstream error:", err);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (err) {
    console.error("Stream error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Error en stream" });
  }
});
/**
 * Opcional: /artist?id=...  /album?id=...  /playlist?id=...
 * Puedes agregar otros endpoints usando la misma estructura (api.deezer.com/artist/{id})
 */
app.listen(PORT, () => {
  console.log(`🚀 Musikfy (Deezer) server listening on port ${PORT}`);
});
0 commit comments
Comments
0
 (0)
Comment
You're not receiving notifications from this thread.

