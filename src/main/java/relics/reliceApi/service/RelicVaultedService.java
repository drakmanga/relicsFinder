package relics.reliceApi.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.Relic;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RelicVaultedService {

    private String getPageHtml() throws IOException {
        return Jsoup.connect("https://warframe.fandom.com/wiki/Void_Relic#List_of_Void_Relics_and_Drop_Sites").get().html();
    }

    public Map<String, List<Relic>> extractUnvaultedRelics() throws IOException {
        String html = getPageHtml();
        Set<Relic> relics = new HashSet<>();

        Document doc = Jsoup.parse(html);

        Element table = doc.selectFirst("table.article-table:has(caption:contains(Unvaulted/Available Relics))");
        if (table == null) {
            System.out.println("Tabella non trovata");
            return Collections.emptyMap();
        }

        Elements rows = table.select("tbody > tr");
        if (rows.size() < 2) {
            System.out.println("Righe insufficienti nella tabella");
            return Collections.emptyMap();
        }

        Element relicsRow = rows.get(1);
        Elements columns = relicsRow.select("td");

        for (Element cell : columns) {
            Elements listItems = cell.select("ul > li");

            for (Element li : listItems) {
                Element a = li.selectFirst("a");
                if (a != null) {
                    String text = a.text().trim();
                    String[] parts = text.split(" ", 2);
                    if (parts.length == 2) {
                        relics.add(new Relic(parts[0], parts[1]));
                    }
                }
            }
        }

        Map<String, Integer> orderMap = Map.of(
                "Lith", 1,
                "Meso", 2,
                "Neo", 3,
                "Axi", 4,
                "Requiem", 5
        );

        Map<String, List<Relic>> grouped = relics.stream()
                .collect(Collectors.groupingBy(Relic::getTier));

        for (List<Relic> list : grouped.values()){
            list.sort(Comparator.comparing(Relic::getRelicName, String.CASE_INSENSITIVE_ORDER));
        }

        Map<String, List<Relic>> sortedGrouped = new LinkedHashMap<>();
        grouped.entrySet().stream()
                        .sorted(Comparator.comparingInt(e -> orderMap.getOrDefault(e.getKey(), 999)))
                        .forEachOrdered(e -> sortedGrouped.put(e.getKey(), e.getValue()));
        return sortedGrouped;
    }

    public boolean isVaulted(String relicName) throws IOException {
        Map<String,List<Relic>> unvaultedRelics = extractUnvaultedRelics();
        String fullRelicName = (relicName.replace("_", " ").trim().toLowerCase());

        Set<String> unvaultedLower = unvaultedRelics.values().stream()
                .flatMap(List::stream)
                .map(relic -> (relic.getTier() + relic.getRelicName().toLowerCase()))
                .collect(Collectors.toSet());

        boolean isUnvaulted = unvaultedLower.contains(fullRelicName);
        return !isUnvaulted;
    }

}




