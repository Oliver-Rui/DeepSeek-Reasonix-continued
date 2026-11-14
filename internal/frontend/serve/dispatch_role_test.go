package serve

import (
	"context"
	"net/http/httptest"
	"testing"

	"reasonix/internal/session/control"
	"reasonix/internal/state/sessionstore"
)

// runtimeOf finds the pane a fixture controller drives, for reads that go
// through that pane's own handler.
func runtimeOf(f *dispatchFixture, ctrl *control.Controller) *Runtime {
	f.t.Helper()
	for _, rt := range f.hub.localRuntimes() {
		if rt.Server.Controller() == ctrl {
			return rt
		}
	}
	f.t.Fatalf("no pane drives the given controller")
	return nil
}

// A dispatch that names a role names the pane it opened: the role is written as
// the target's explicit title and the tree shows it. A role-less dispatch
// writes no title, so the pane keeps the preview the listing derives.
func TestADispatchWithARoleNamesTheSessionItOpened(t *testing.T) {
	f := newDispatchFixture(t, dispatchOn)
	a, b := f.project("alpha", true), f.project("billing", true)
	sender := f.sender(a)

	got, err := sender.DispatchToProject(context.Background(), "billing", "rotate the key", "reviewer")
	if err != nil {
		t.Fatal(err)
	}
	pane := f.paneOf(got.Key)
	if meta, ok, err := sessionstore.LoadBranchMeta(pane.SessionPath()); err != nil || !ok || meta.CustomTitle != "reviewer" {
		t.Fatalf("branch meta = %+v (present %v, err %v), want CustomTitle reviewer", meta, ok, err)
	}
	// The tree lists a conversation only once its transcript exists, and the
	// pane is idle; seed the file its first turn would have written.
	writeSessionAt(t, pane.SessionPath())
	srv := httptest.NewServer(operatorHandler(f.hub))
	defer srv.Close()
	var title string
	var listed bool
	for _, ws := range hubGet[[]treeWorkspace](t, srv, "/tree") {
		if ws.Root != b {
			continue
		}
		for _, row := range ws.Sessions {
			if row.Path == pane.SessionPath() {
				title, listed = row.Title, true
			}
		}
	}
	if !listed || title != "reviewer" {
		t.Fatalf("tree row for the dispatched session: listed %v title %q, want reviewer", listed, title)
	}

	plain, err := sender.DispatchToProject(context.Background(), f.project("ledger", true), "count the rows", "")
	if err != nil {
		t.Fatal(err)
	}
	if meta, ok, err := sessionstore.LoadBranchMeta(f.paneOf(plain.Key).SessionPath()); err == nil && ok && meta.CustomTitle != "" {
		t.Fatalf("a role-less dispatch wrote the title %q, want none", meta.CustomTitle)
	}
}

// The sender's thread rows carry the role each dispatched pane was opened for,
// joined from the dispatch book through the pane's own /peers; a thread to a
// pane no dispatch opened carries none.
func TestTheSenderThreadsCarryTheDispatchRole(t *testing.T) {
	f := newDispatchFixture(t, dispatchOn)
	f.project("billing", true)
	f.project("ledger", true)
	sender := f.sender(f.project("alpha", true))

	first, err := sender.DispatchToProject(context.Background(), "billing", "rotate the key", "reviewer")
	if err != nil {
		t.Fatal(err)
	}
	second, err := sender.DispatchToProject(context.Background(), "ledger", "count the rows", "")
	if err != nil {
		t.Fatal(err)
	}

	srv := httptest.NewServer(operatorHandler(runtimeOf(f, sender).Server))
	defer srv.Close()
	type peersAnswer struct {
		Threads []control.PeerThread `json:"threads"`
	}
	byKey := map[string]control.PeerThread{}
	for _, th := range hubGet[peersAnswer](t, srv, "/peers").Threads {
		byKey[th.Key] = th
	}
	if th, ok := byKey[first.Key]; !ok || th.Role != "reviewer" {
		t.Fatalf("thread for the dispatched pane = %+v (present %v), want role reviewer", th, ok)
	}
	if th, ok := byKey[second.Key]; !ok || th.Role != "" {
		t.Fatalf("thread for the role-less pane = %+v (present %v), want no role", th, ok)
	}
}
