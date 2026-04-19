function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1 style={{ fontSize: '4rem' }}>Rail Baron</h1>
      <img src={`${process.env.PUBLIC_URL}/railbaron.png`} alt="Rail Baron" width={600} />
    </div>
  );
}

export default Home;