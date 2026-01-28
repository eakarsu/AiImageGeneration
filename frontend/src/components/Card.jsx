function Card({ title, text, badge, imageUrl, onClick }) {
  return (
    <div className="card" onClick={onClick}>
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
