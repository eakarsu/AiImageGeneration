function Card({ title, text, badge, imageUrl, onClick, selectable, selected, onSelect }) {
  return (
    <div className={`card${selectable ? ' card-selectable' : ''}`} onClick={onClick}>
      {selectable && (
        <input
          type="checkbox"
          className="card-checkbox"
          checked={selected || false}
          onChange={(e) => {
            e.stopPropagation();
            onSelect && onSelect();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {imageUrl && <img className="card-image" src={imageUrl} alt={title} />}
      <div className="card-body">
        <div className="card-title">{title}</div>
        {text && <div className="card-text">{text}</div>}
        {badge && <span className="card-badge">{badge}</span>}
      </div>
    </div>
  );
}

export default Card;
