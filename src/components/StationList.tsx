import React from 'react'
import { TransferStation, Currency, AppMode } from '../types/config'
import FaviconIcon from './FaviconIcon'
import { EditIcon, DollarIcon, CheckIcon, TrashIcon } from './Icons'
import { useLanguage } from '../contexts/LanguageContext'
import './StationList.css'

interface Props {
  mode: AppMode
  stations: TransferStation[]
  activeStationId: string | null
  onEdit: (station: TransferStation) => void
  onDelete: (id: string) => void
  onApply: (id: string) => void
  onSetBalance: (station: TransferStation) => void
}

const StationList: React.FC<Props> = ({ stations, activeStationId, onEdit, onDelete, onApply, onSetBalance }) => {
  const { t } = useLanguage()

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return t('never')
    return new Date(timestamp).toLocaleString()
  }

  const formatBalance = (balance?: number, currency?: Currency) => {
    if (balance === undefined || balance === null) return t('notSet')
    const symbol = currency === 'CNY' ? '¥' : '$'
    return `${symbol}${balance.toFixed(2)}`
  }

  const handleUrlClick = (url: string) => {
    window.electronAPI?.shell?.openExternal?.(url) || window.open(url, '_blank')
  }

  // Sort: active station first, then by last used, then by created date
  const sortedStations = [...stations].sort((a, b) => {
    // Active station always on top
    if (a.id === activeStationId) return -1
    if (b.id === activeStationId) return 1

    // Then by last used
    if (a.lastUsed && b.lastUsed) return b.lastUsed - a.lastUsed
    if (a.lastUsed) return -1
    if (b.lastUsed) return 1

    // Finally by created date
    return b.createdAt - a.createdAt
  })

  return (
    <div className="station-list">
      {sortedStations.map((station) => (
        <div
          key={station.id}
          className={`station-card ${station.id === activeStationId ? 'active' : ''}`}
        >
          <div className="station-header">
            <div className="station-info">
              <div className="station-title">
                <FaviconIcon src={station.favicon} name={station.name} size={24} />
                <h3 className="station-name">{station.name}</h3>
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  handleUrlClick(station.baseUrl)
                }}
                className="station-url"
              >
                {station.baseUrl}
              </a>
              {station.lastUsed && (
                <span className="meta-inline">
                  {t('last')}: {formatDate(station.lastUsed)}
                </span>
              )}
            </div>
            <div className="station-balance">
              <span className="balance-value">{formatBalance(station.balance, station.currency)}</span>
              {station.balanceLastUpdated && (
                <span className="balance-updated">
                  {formatDate(station.balanceLastUpdated)}
                </span>
              )}
            </div>
          </div>

          <div className="station-actions">
            <button
              onClick={() => onEdit(station)}
              className="btn-icon-mini"
              title={t('edit')}
            >
              <EditIcon size={16} />
            </button>
            <button
              onClick={() => onSetBalance(station)}
              className="btn-icon-mini"
              title={t('balance')}
            >
              <DollarIcon size={16} />
            </button>
            <button
              onClick={() => onApply(station.id)}
              className="btn-apply-mini"
              title={t('apply')}
            >
              <CheckIcon size={14} />
              <span>{t('apply')}</span>
            </button>
            <button
              onClick={() => onDelete(station.id)}
              className="btn-delete-mini"
              title={t('delete')}
            >
              <TrashIcon size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StationList
