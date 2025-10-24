import React, { useState, useEffect } from 'react'
import { TransferStation, Currency, AppMode } from '../types/config'
import { useLanguage } from '../contexts/LanguageContext'
import './BalanceDialog.css'

interface Props {
  mode: AppMode
  station: TransferStation
  onSave: (balance: number, currency: Currency) => void
  onClose: () => void
}

const BalanceDialog: React.FC<Props> = ({ mode: _mode, station, onSave, onClose }) => {
  const { t } = useLanguage()
  const [balance, setBalance] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')

  useEffect(() => {
    if (station.balance !== undefined) {
      setBalance(station.balance.toString())
    }
    if (station.currency) {
      setCurrency(station.currency)
    }
  }, [station])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const balanceNum = parseFloat(balance)

    if (isNaN(balanceNum) || balanceNum < 0) {
      alert(t('missingFields'))
      return
    }

    onSave(balanceNum, currency)
    onClose()
  }

  const getCurrencySymbol = (curr: Currency) => {
    return curr === 'CNY' ? '¥' : '$'
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog balance-dialog compact" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header compact">
          <h2>{t('setBalance')}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="station-name-display compact">
            {station.name}
          </div>

          <div className="form-group compact">
            <label>{t('currency')}</label>
            <div className="currency-selector compact">
              <button
                type="button"
                className={`currency-btn ${currency === 'USD' ? 'active' : ''}`}
                onClick={() => setCurrency('USD')}
              >
                $ USD
              </button>
              <button
                type="button"
                className={`currency-btn ${currency === 'CNY' ? 'active' : ''}`}
                onClick={() => setCurrency('CNY')}
              >
                ¥ CNY
              </button>
            </div>
          </div>

          <div className="form-group compact">
            <label>{t('amount')}</label>
            <div className="balance-input-wrapper">
              <span className="currency-prefix">{getCurrencySymbol(currency)}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="balance-input"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="dialog-actions compact">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BalanceDialog
