import { useCallback, useEffect, useRef, useState } from 'react';
import { ADMIN_TABLE_MIN_COLUMN_WIDTH } from './adminTableColumnDefaults';
import { clearAdminTableColumnWidths, getAdminTableColumnWidths, setAdminTableColumnWidths } from './adminTableColumnWidthStore';
import './AdminTableResize.css';

export function useAdminTableResize(tableKey: string, defaultWidths: readonly number[]) {
  const [tableElement, setTableElement] = useState<HTMLTableElement | null>(null);
  const [widths, setWidths] = useState(() => getAdminTableColumnWidths(tableKey, defaultWidths));
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const tableRef = useCallback((node: HTMLTableElement | null) => {
    setTableElement(node);
  }, []);

  const persistWidths = useCallback(
    (nextWidths: number[]) => {
      widthsRef.current = nextWidths;
      setAdminTableColumnWidths(tableKey, nextWidths);
      setWidths([...nextWidths]);
    },
    [tableKey],
  );

  const syncColgroup = useCallback((table: HTMLTableElement, nextWidths: number[]) => {
    let colgroup = table.querySelector('colgroup');
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      table.insertBefore(colgroup, table.firstChild);
    }

    const existingCols = Array.from(colgroup.querySelectorAll('col'));
    nextWidths.forEach((width, index) => {
      const col = existingCols[index] ?? document.createElement('col');
      (col as HTMLTableColElement).style.width = `${width}px`;
      if (!existingCols[index]) {
        colgroup!.appendChild(col);
      }
    });

    while (colgroup.children.length > nextWidths.length) {
      colgroup.lastElementChild?.remove();
    }
  }, []);

  useEffect(() => {
    if (!tableElement) {
      return;
    }

    syncColgroup(tableElement, widths);
    tableElement.classList.add('admin-table-resizable');
  }, [syncColgroup, tableElement, widths]);

  useEffect(() => {
    if (!tableElement) {
      return;
    }

    const headers = Array.from(tableElement.querySelectorAll('thead tr:first-child th'));
    const cleanups: Array<() => void> = [];

    headers.forEach((header, index) => {
      if (index >= defaultWidths.length - 1) {
        return;
      }

      header.classList.add('admin-table-resizable-header');

      const handle = document.createElement('span');
      handle.className = 'admin-table-col-resize-handle';
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', 'Изменить ширину столбца');
      header.appendChild(handle);

      const onMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startWidth = widthsRef.current[index] ?? defaultWidths[index];
        document.body.classList.add('admin-table-col-resizing');

        const onMouseMove = (moveEvent: MouseEvent) => {
          const nextWidth = Math.max(
            ADMIN_TABLE_MIN_COLUMN_WIDTH,
            startWidth + moveEvent.clientX - startX,
          );
          const nextWidths = [...widthsRef.current];
          nextWidths[index] = nextWidth;
          widthsRef.current = nextWidths;
          syncColgroup(tableElement, nextWidths);
        };

        const onMouseUp = () => {
          document.body.classList.remove('admin-table-col-resizing');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          persistWidths([...widthsRef.current]);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      handle.addEventListener('mousedown', onMouseDown);
      cleanups.push(() => {
        handle.removeEventListener('mousedown', onMouseDown);
        handle.remove();
        header.classList.remove('admin-table-resizable-header');
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [defaultWidths, persistWidths, syncColgroup, tableElement]);

  const resetColumnWidths = useCallback(() => {
    const defaults = [...defaultWidths];
    clearAdminTableColumnWidths(tableKey);
    widthsRef.current = defaults;
    setWidths(defaults);
    if (tableElement) {
      syncColgroup(tableElement, defaults);
    }
  }, [defaultWidths, syncColgroup, tableElement, tableKey]);

  return { tableRef, resetColumnWidths };
}
