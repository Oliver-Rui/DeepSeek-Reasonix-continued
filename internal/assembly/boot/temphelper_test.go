package boot

import (
	"os"
	"testing"

	"reasonix/internal/base/testenv"
)

// robustTempDir is testenv.TempDir, whose cleanup retries RemoveAll for
// handles that outlive Close by milliseconds. The process-global catalogs are
// closed first: an open SQLite file outlasts every retry on Windows.
func robustTempDir(t *testing.T) string {
	t.Helper()
	dir := testenv.TempDir(t)
	t.Cleanup(func() { closeBootTestHistoryCatalog(t) })
	return dir
}

// fixtureRoot states the process cwd as the workspace root for a helper whose
// caller chdir'd into a temp fixture. The implicit cwd fallback walks up for
// .git, so a repository above the temp dir (a dotfiles home, say) would win and
// silently swap the fixture's config out of the build.
func fixtureRoot(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	return wd
}
