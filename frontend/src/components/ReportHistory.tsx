import { useState, useEffect } from 'react';
import { Trash2, Search, X } from 'lucide-react';
import { getBackendPort } from '../utils/getBackendPort';

interface ReportFile {
  name: string;
  path: string;
  type: string;
}

interface ReportFolder {
  folderName: string;
  createdAt: string;
  reportTypes: string[];
  files: ReportFile[];
}

export default function ReportHistory() {
  const [reports, setReports] = useState<ReportFolder[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [port, setPort] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  useEffect(() => {
    const loadPort = async () => {
      const p = await getBackendPort();
      setPort(p);
    };
    loadPort();
  }, []);

  useEffect(() => {
    if (port) {
      fetchReports();
    }
  }, [port]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredReports(reports);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredReports(
        reports.filter(
          (report) =>
            report.folderName.toLowerCase().includes(query) ||
            report.createdAt.toLowerCase().includes(query) ||
            report.reportTypes.some((type) => type.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, reports]);

  const fetchReports = async () => {
    if (!port) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:${port}/api/reports/list`);
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      const data = await response.json();
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (folderName: string) => {
    if (!port) return;
    
    try {
      const response = await fetch(`http://localhost:${port}/api/reports/${folderName}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      setDeleteConfirm(null);
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const handleDeleteAll = async () => {
    if (!port) return;
    
    try {
      const response = await fetch(`http://localhost:${port}/api/reports`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete all reports');
      }
      setDeleteAllConfirm(false);
      fetchReports();
    } catch (error) {
      console.error('Error deleting all reports:', error);
      alert('Failed to delete all reports');
    }
  };

  const openReport = (folderName: string, filePath: string, reportType?: string) => {
    if (!port) return;
    // For Allure reports, ensure we use index.html
    if (reportType === 'allure') {
      const url = `http://localhost:${port}/reports/${folderName}/allure/index.html`;
      window.open(url, '_blank');
    } else {
      const url = `http://localhost:${port}/reports/${folderName}/${filePath}`;
      window.open(url, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Report History</h1>
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Clean All Button */}
            <button
              onClick={() => setDeleteAllConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} />
              Clean All
            </button>
          </div>
        </div>

        {/* Delete All Confirmation */}
        {deleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Delete All Reports?</h3>
              <p className="text-gray-300 mb-6">
                This will permanently delete all report folders. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteAllConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reports Table */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchQuery ? 'No reports found matching your search.' : 'No reports available.'}
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700 border-b border-gray-600">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Workflow Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Created At</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Reports</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.folderName} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm">{report.folderName}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(report.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {report.reportTypes.length > 0 ? (
                          report.reportTypes.map((reportType) => {
                            // For Allure, show a single button that opens index.html
                            if (reportType === 'allure') {
                              return (
                                <button
                                  key={reportType}
                                  onClick={() => openReport(report.folderName, '', 'allure')}
                                  className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                                >
                                  Allure Report
                                </button>
                              );
                            }
                            // For other report types, find the main file (index.html, report.html, report.json, etc.)
                            const mainFile = report.files.find(
                              (f) => f.type === reportType && 
                              (f.name === 'index.html' || f.name === 'report.html' || f.name === 'report.json' || f.name === 'report.xml' || f.name === 'report.csv' || f.name === 'report.md')
                            ) || report.files.find((f) => f.type === reportType);
                            
                            if (mainFile) {
                              return (
                                <button
                                  key={reportType}
                                  onClick={() => openReport(report.folderName, mainFile.path, reportType as any)}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors capitalize"
                                >
                                  {reportType === 'html' ? 'HTML' : reportType.toUpperCase()}
                                </button>
                              );
                            }
                            return null;
                          })
                        ) : (
                          <span className="text-gray-400">No reports</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {deleteConfirm === report.folderName ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Confirm?</span>
                          <button
                            onClick={() => handleDelete(report.folderName)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(report.folderName)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
