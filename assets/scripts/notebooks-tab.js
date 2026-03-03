/**
 * Notebooks Tab Logic
 * Handles rendering the list of notebooks in the home page tab
 */

document.addEventListener('DOMContentLoaded', () => {
    // Wait for notebook bundle to load
    if (window.MaterioNotebook) {
        initNotebooksTab();
    } else {
        window.addEventListener('bundle:loaded', initNotebooksTab);
    }
});

function initNotebooksTab() {
    const grid = document.getElementById('notebooksGridInTab');
    const emptyState = document.getElementById('emptyStateInTab');
    const syncBtn = document.getElementById('syncBtnInTab');

    if (!window.MaterioNotebook || !grid) {
        return;
    }

    // Show sync button for privileged users
    if (window.materioUserHasAdminPrivileges || window.materioUserHasPrivateAccess) {
        if (syncBtn) syncBtn.style.display = 'inline-flex';
    }

    function renderNotebooks() {
        const notebooks = window.MaterioNotebook.getAll();
        const filter = document.getElementById('notebookFilter')?.value || 'all';

        let filteredNotebooks = notebooks;
        if (filter === 'linked') {
            filteredNotebooks = notebooks.filter(n => n.linkedPdf);
        }

        if (filteredNotebooks.length === 0) {
            grid.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block';
                const emptyText = emptyState.querySelector('p');
                if (emptyText) {
                    emptyText.textContent = filter === 'linked' ? 'No notes are linked to PDFs yet.' : 'Create your first note to get started.';
                }
            }
            return;
        }

        grid.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        grid.innerHTML = '';

        // Sort by updated date desc
        const sortedNotebooks = [...filteredNotebooks].sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        sortedNotebooks.forEach(notebook => {
            const card = document.createElement('div');
            card.className = 'notebook-card';

            // Strip HTML for preview
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = notebook.content || '';
            const previewText = tempDiv.textContent || 'No content';

            const dateStr = new Date(notebook.updatedAt).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
            });

            let badgeHtml = '';
            if (notebook.linkedPdf) {
                badgeHtml = `<div class="notebook-card-link"><i class="fas fa-file-pdf"></i> PDF</div>`;
            }

            if (notebook.syncedToCloud) {
                badgeHtml += `<div class="notebook-card-link" style="margin-left: 6px; background: rgba(59, 130, 246, 0.1); color: #3b82f6;"><i class="fas fa-cloud"></i></div>`;
            }

            card.innerHTML = `
                <div class="notebook-card-content" onclick="window.MaterioNotebook.open('${notebook.id}')">
                    <h3 class="notebook-card-title">
                        <i class="far fa-file-lines"></i>
                        ${notebook.title || 'Untitled Note'}
                    </h3>
                    <div class="notebook-card-preview">${previewText.slice(0, 150)}${previewText.length > 150 ? '...' : ''}</div>
                    <div class="notebook-card-meta">
                        <span class="notebook-card-date">${dateStr}</span>
                        <div class="notebook-card-badges">${badgeHtml}</div>
                    </div>
                </div>
                <div class="notebook-card-actions-quick">
                    <button class="card-action-btn delete" title="Delete note" onclick="event.stopPropagation(); window.MaterioNotebook.delete('${notebook.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Initial render
    renderNotebooks();

    // Listen for storage changes to update list
    window.addEventListener('storage', (e) => {
        if (e.key === 'materio_notebooks') {
            renderNotebooks();
        }
    });

    // Listen for local notebook updates (save/delete from modal)
    document.addEventListener('notebook:update', () => {
        renderNotebooks();
    });

    // Listen for tab switch to notebooks
    document.addEventListener('tabOpened', (e) => {
        if (e.detail.tab === 'notebooks') {
            renderNotebooks();
        }
    });

    // Add filter change listener
    const filter = document.getElementById('notebookFilter');
    if (filter) {
        filter.addEventListener('change', () => {
            renderNotebooks();
        });
    }

    // Global sync function for the tab
    window.syncNotebooks = async () => {
        const btn = document.getElementById('syncBtnInTab');
        if (!btn) return;

        const icon = btn.querySelector('i');
        const originalIconClass = icon.className;

        icon.className = 'fas fa-spinner fa-spin';
        btn.disabled = true;

        if (window.MaterioNotebook.syncToCloud) {
            await window.MaterioNotebook.syncToCloud();
        }

        // re-render in case of updates
        renderNotebooks();

        setTimeout(() => {
            icon.className = originalIconClass;
            btn.disabled = false;
        }, 1000);
    };
}
