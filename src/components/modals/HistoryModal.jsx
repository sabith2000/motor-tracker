import { useState, useEffect, useCallback, useRef } from 'react';
import { getLogsPage, getUsageStats } from '../../api';
import toast from 'react-hot-toast';

export default function HistoryModal({ isOpen, onClose }) {
    // Current filter (null = all time, 1 = today, 7 = last 7 days, 30 = last 30 days)
    const [daysFilter, setDaysFilter] = useState(7);

    // Stats state — keep stale data visible during refetch
    const [stats, setStats] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Logs pagination state
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLogsLoading, setIsLogsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const limit = 20;

    // Track whether we're transitioning (for opacity effect)
    const [isTransitioning, setIsTransitioning] = useState(false);

    const modalBodyRef = useRef(null);

    // Fetch stats (stale-while-revalidate: old data stays visible)
    const fetchStats = useCallback(async (days) => {
        // Only show full skeleton on first load, otherwise just dim
        if (!hasLoadedOnce) {
            setIsStatsLoading(true);
        } else {
            setIsTransitioning(true);
        }
        try {
            const data = await getUsageStats(days);
            setStats(data);
            setHasLoadedOnce(true);
        } catch (error) {
            console.error('Failed to load stats:', error);
            toast.error('Failed to load analytics');
        } finally {
            setIsStatsLoading(false);
            setIsTransitioning(false);
        }
    }, [hasLoadedOnce]);

    // Fetch paginated logs
    const fetchLogs = useCallback(async (pageNum, isLoadMore = false) => {
        if (isLoadMore) {
            setIsLoadingMore(true);
        } else if (!hasLoadedOnce) {
            setIsLogsLoading(true);
        } else {
            setIsTransitioning(true);
        }
        try {
            const data = await getLogsPage(pageNum, limit, null);
            setLogs(prev => isLoadMore ? [...prev, ...data.logs] : data.logs);
            setHasMore(data.pagination.hasMore);
            setPage(data.pagination.page);
        } catch (error) {
            console.error('Failed to load logs:', error);
            toast.error('Failed to load history');
        } finally {
            setIsLogsLoading(false);
            setIsLoadingMore(false);
            setIsTransitioning(false);
        }
    }, [hasLoadedOnce]);

    // Load data when modal opens or filter changes
    useEffect(() => {
        if (!isOpen) return;
        fetchStats(daysFilter);
        fetchLogs(1, false);
    }, [isOpen, daysFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setHasLoadedOnce(false);
            setStats(null);
            setLogs([]);
            setPage(1);
            setHasMore(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Group logs by date
    const groupedLogs = logs.reduce((acc, log) => {
        const d = log.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(log);
        return acc;
    }, {});

    const getDurationColor = (minutes) => {
        if (minutes < 5) return 'duration-badge-green';
        if (minutes <= 15) return 'duration-badge-amber';
        return 'duration-badge-red';
    };

    const getFilterLabel = (days) => {
        if (!days) return 'All Time';
        if (days === 1) return 'Today';
        return `Last ${days} Days`;
    };

    // Show full skeleton only on very first load
    const showSkeleton = isStatsLoading && !stats;
    // Dim content when transitioning between filters
    const contentOpacity = isTransitioning ? 'opacity-50' : 'opacity-100';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border border-slate-700 shadow-2xl flex flex-col animate-fade-in-up max-w-4xl overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        History & Analytics
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex gap-2 p-4 bg-slate-900 border-b border-slate-800 overflow-x-auto hide-scrollbar flex-shrink-0">
                    {[1, 7, 30, null].map(days => (
                        <button
                            key={days || 'all'}
                            onClick={() => setDaysFilter(days)}
                            disabled={isTransitioning}
                            className={`filter-chip ${daysFilter === days ? 'filter-chip-active' : ''} ${isTransitioning ? 'pointer-events-none' : ''}`}
                        >
                            {getFilterLabel(days)}
                        </button>
                    ))}
                    {/* Subtle loading indicator next to filters */}
                    {isTransitioning && (
                        <div className="flex items-center ml-1">
                            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6" ref={modalBodyRef}>

                    {/* Summary Stats */}
                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-opacity duration-200 ${contentOpacity}`}>
                        <div className="stat-card p-3 rounded-xl text-center">
                            <p className="text-xs text-slate-400 mb-1">Total Sessions</p>
                            {showSkeleton ? (
                                <div className="h-7 w-16 bg-slate-700 animate-pulse rounded mx-auto" />
                            ) : (
                                <p className="text-xl font-bold text-white">{stats?.totalSessions || 0}</p>
                            )}
                        </div>
                        <div className="stat-card p-3 rounded-xl text-center">
                            <p className="text-xs text-slate-400 mb-1">Total Runtime</p>
                            {showSkeleton ? (
                                <div className="h-7 w-16 bg-slate-700 animate-pulse rounded mx-auto" />
                            ) : (
                                <p className="text-xl font-bold text-blue-400">{stats?.totalMinutes || 0} <span className="text-xs text-slate-500 font-normal">min</span></p>
                            )}
                        </div>
                        <div className="stat-card p-3 rounded-xl text-center">
                            <p className="text-xs text-slate-400 mb-1">Avg Duration</p>
                            {showSkeleton ? (
                                <div className="h-7 w-16 bg-slate-700 animate-pulse rounded mx-auto" />
                            ) : (
                                <p className="text-xl font-bold text-green-400">{stats?.avgDuration || 0} <span className="text-xs text-slate-500 font-normal">min</span></p>
                            )}
                        </div>
                        <div className="stat-card p-3 rounded-xl text-center">
                            <p className="text-xs text-slate-400 mb-1">Longest Session</p>
                            {showSkeleton ? (
                                <div className="h-7 w-16 bg-slate-700 animate-pulse rounded mx-auto" />
                            ) : (
                                <p className="text-xl font-bold text-amber-400">{stats?.longestSession || 0} <span className="text-xs text-slate-500 font-normal">min</span></p>
                            )}
                        </div>
                    </div>

                    {/* Daily Analytics Mini Chart */}
                    {stats?.dailyUsage?.length > 0 && (
                        <div className={`bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 transition-opacity duration-200 ${contentOpacity}`}>
                            <h3 className="text-sm font-medium text-slate-300 mb-3">Daily Breakdown</h3>
                            <div className="space-y-2">
                                {stats.dailyUsage.slice(0, 5).map(day => (
                                    <div key={day.date} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400 w-24">{day.date.substring(0, 5)}</span>
                                        <div className="flex-1 mx-3 hidden sm:block">
                                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.min(100, (day.totalMinutes / (stats.longestSession || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-right">
                                            <span className="text-slate-300 w-12">{day.sessions} runs</span>
                                            <span className="text-blue-400 font-medium w-16">{day.totalMinutes}m</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Session History List */}
                    <div className={`transition-opacity duration-200 ${contentOpacity}`}>
                        <h3 className="text-sm font-medium text-slate-300 mb-4 sticky top-0 bg-slate-900 py-2 z-10">
                            Session History
                        </h3>

                        {/* Full skeleton on first load */}
                        {isLogsLoading && logs.length === 0 ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 animate-pulse">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-700 rounded-full" />
                                                <div className="h-4 w-32 bg-slate-700 rounded" />
                                            </div>
                                            <div className="h-6 w-16 bg-slate-700 rounded-md" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                <span className="text-4xl mb-3 block">📭</span>
                                <p className="text-slate-400">No motor sessions recorded yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.keys(groupedLogs).map(date => (
                                    <div key={date}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{date}</h4>
                                            <div className="flex-1 h-px bg-slate-700/50" />
                                        </div>
                                        <div className="space-y-2">
                                            {groupedLogs[date].map(log => (
                                                <div key={log.id} className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full bg-slate-700 ${log.exportedToSheets ? 'text-green-400' : 'text-slate-400'}`} title={log.exportedToSheets ? 'Exported' : 'Pending Export'}>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <div className="text-white text-sm font-medium">
                                                                {log.startTime} <span className="text-slate-500 font-normal mx-1">→</span> {log.endTime}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getDurationColor(log.durationMinutes)}`}>
                                                        {log.durationMinutes} min
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Load More */}
                                {hasMore && (
                                    <button
                                        onClick={() => fetchLogs(page + 1, true)}
                                        disabled={isLoadingMore}
                                        className="w-full py-3 mt-4 rounded-xl border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/10 transition-colors flex justify-center items-center gap-2"
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                Loading...
                                            </>
                                        ) : 'Load More Sessions'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
