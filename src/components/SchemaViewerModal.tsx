import React, { useState } from 'react';
import { X, Search, Database, Key, Link as LinkIcon, RefreshCw, Layers } from 'lucide-react';
import { DatabaseSchemaInfo, TableSchema } from '../types';

interface SchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: DatabaseSchemaInfo | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const SchemaViewerModal: React.FC<SchemaViewerModalProps> = ({
  isOpen,
  onClose,
  schema,
  onRefresh,
  isRefreshing
}) => {
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  if (!isOpen) return null;

  const tables = schema?.tables || [];
  const filteredTables = tables.filter(t =>
    t.table.toLowerCase().includes(search.toLowerCase()) ||
    t.columns.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const activeTable = tables.find(t => t.table === (selectedTable || tables[0]?.table));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Dynamic Database Schema Explorer
              </h2>
              <p className="text-xs text-slate-500">
                Database: <span className="font-mono text-slate-800">{schema?.databaseName}</span> • Dialect: PostgreSQL • Discovered tables: {tables.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Table List Sidebar */}
          <div className="w-full md:w-72 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter tables & columns..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredTables.map(t => {
                const isSelected = (activeTable?.table === t.table);
                return (
                  <button
                    key={t.table}
                    onClick={() => setSelectedTable(t.table)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-left transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Layers className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                      <span className="truncate">{t.table}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {t.rowCount !== undefined ? `${t.rowCount} rows` : `${t.columns.length} cols`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Details Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTable ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <span>{activeTable.table}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activeTable.columns.length} columns • {activeTable.rowCount || 0} rows estimated
                    </p>
                  </div>
                </div>

                {/* Columns Table */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Columns & Data Types
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="px-3.5 py-2 font-semibold">Column</th>
                          <th className="px-3.5 py-2 font-semibold">Data Type</th>
                          <th className="px-3.5 py-2 font-semibold">Constraint</th>
                          <th className="px-3.5 py-2 font-semibold">Nullable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeTable.columns.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="px-3.5 py-2 font-mono font-medium text-slate-900 flex items-center space-x-1.5">
                              {c.isPrimaryKey && (
                                <Key className="w-3 h-3 text-amber-500" />
                              )}
                              <span>{c.name}</span>
                            </td>
                            <td className="px-3.5 py-2 font-mono text-slate-600">
                              {c.type}
                            </td>
                            <td className="px-3.5 py-2">
                              {c.isPrimaryKey ? (
                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  PRIMARY KEY
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2 text-slate-500">
                              {c.isNullable ? 'YES' : 'NO'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Foreign Keys */}
                {activeTable.foreignKeys.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Foreign Key Relationships
                    </h4>
                    <div className="space-y-1.5">
                      {activeTable.foreignKeys.map((fk, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-semibold text-slate-800">{fk.column}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-indigo-600 font-semibold">{fk.referencesTable}</span>
                          <span className="text-slate-500">({fk.referencesColumn})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Select a table from the sidebar to inspect its structure.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
